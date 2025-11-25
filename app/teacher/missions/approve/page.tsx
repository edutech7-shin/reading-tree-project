import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { ApproveMissionsDashboard } from './ApproveMissionsDashboard'

export const dynamic = 'force-dynamic'

export default async function ApproveMissionsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'teacher') {
    redirect('/')
  }

  // 교사 확인 대기 중인 미션 완료 기록 가져오기
  const { data: completions, error: completionsError } = await supabase
    .from('mission_completions')
    .select(`
      id,
      assignment_id,
      student_id,
      proof_text,
      proof_image_url,
      completed_at,
      mission_assignments (
        mission_id,
        missions (
          id,
          title,
          type,
          points
        )
      ),
      class_students (
        id,
        name
      )
    `)
    .eq('verification_status', 'pending')
    .order('completed_at', { ascending: false })

  if (completionsError) {
    throw new Error('완료 기록을 불러올 수 없습니다.')
  }

  // Supabase 관계 쿼리 결과를 타입에 맞게 변환
  const transformedCompletions = (completions || []).map((c: any) => {
    const assignment = Array.isArray(c.mission_assignments) ? c.mission_assignments[0] : c.mission_assignments
    const mission = assignment && (Array.isArray(assignment.missions) ? assignment.missions[0] : assignment.missions)
    const student = Array.isArray(c.class_students) ? c.class_students[0] : c.class_students
    
    return {
      id: c.id,
      assignment_id: c.assignment_id,
      student_id: c.student_id,
      proof_text: c.proof_text,
      proof_image_url: c.proof_image_url,
      completed_at: c.completed_at,
      mission_assignments: assignment ? {
        mission_id: assignment.mission_id,
        missions: mission
      } : null,
      class_students: student
    }
  }).filter((c: any) => c.mission_assignments && c.mission_assignments.missions && c.class_students)
    .map((c: any) => ({
      // 필터링 후에는 mission_assignments가 null이 아님을 보장
      id: c.id,
      assignment_id: c.assignment_id,
      student_id: c.student_id,
      proof_text: c.proof_text,
      proof_image_url: c.proof_image_url,
      completed_at: c.completed_at,
      mission_assignments: c.mission_assignments as { mission_id: number; missions: { id: number; title: string; type: string; points: number } },
      class_students: c.class_students as { id: string; name: string }
    }))

  return (
    <main className='container'>
      <ApproveMissionsDashboard completions={transformedCompletions} />
    </main>
  )
}

