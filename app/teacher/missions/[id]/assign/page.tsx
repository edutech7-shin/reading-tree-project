import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'
import { AssignMissionForm } from './AssignMissionForm'

export const dynamic = 'force-dynamic'

export default async function AssignMissionPage({ params }: { params: { id: string } }) {
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

  const missionId = parseInt(params.id)
  if (isNaN(missionId)) {
    redirect('/teacher/missions')
  }

  // 미션 정보 가져오기
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .eq('teacher_id', user.id)
    .single()

  if (missionError || !mission) {
    redirect('/teacher/missions')
  }

  // 학생 목록 가져오기
  const { data: students } = await supabase
    .from('class_students')
    .select('id, name, student_number')
    .eq('teacher_id', user.id)
    .order('student_number', { ascending: true })

  // 이미 할당된 학생 확인
  const { data: existingAssignments } = await supabase
    .from('mission_assignments')
    .select('student_id')
    .eq('mission_id', missionId)

  const assignedStudentIds = new Set((existingAssignments || []).map(a => a.student_id))

  return (
    <main className='container'>
      <AssignMissionForm 
        mission={mission} 
        students={students || []} 
        assignedStudentIds={assignedStudentIds}
      />
    </main>
  )
}

