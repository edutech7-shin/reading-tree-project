import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
import { StudentsDashboard } from './StudentsDashboard'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
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

  const { data: students, error: studentsError } = await supabase
    .from('class_students')
    .select('id, student_number, name, level, leaves, avatar_type')
    .eq('teacher_id', user.id)
    .order('student_number', { ascending: true })

  if (studentsError) {
    throw new Error('학생 정보를 불러올 수 없습니다.')
  }

  const payload = (students ?? []).map((student) => ({
    id: student.id,
    studentNumber: student.student_number,
    name: student.name,
    level: student.level,
    leaves: student.leaves,
    avatarType: student.avatar_type
  }))

  return (
    <main className='container'>
      <StudentsDashboard students={payload} />
    </main>
  )
}
