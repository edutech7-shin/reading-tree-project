import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { CreateMissionForm } from './CreateMissionForm'

export const dynamic = 'force-dynamic'

export default async function CreateMissionPage() {
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

  // 학생 목록 가져오기 (할당용)
  const { data: students } = await supabase
    .from('class_students')
    .select('id, name, student_number')
    .eq('teacher_id', user.id)
    .order('student_number', { ascending: true })

  return (
    <main className='container'>
      <CreateMissionForm students={students || []} />
    </main>
  )
}

