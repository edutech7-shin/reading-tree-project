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

  // 교사의 미션인지 필터링
  const filteredCompletions = (completions || []).filter((completion: any) => {
    const assignment = completion.mission_assignments
    const mission = assignment?.missions
    // 교사 ID 확인은 클라이언트에서 처리
    return mission
  })

  return (
    <main className='container'>
      <ApproveMissionsDashboard completions={filteredCompletions} />
    </main>
  )
}

