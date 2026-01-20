import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
import { TeacherBadgeGrant } from './TeacherBadgeGrant'

export const dynamic = 'force-dynamic'

export default async function TeacherBadgesPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'teacher') redirect('/')

  const [studentsRes, badgesRes] = await Promise.all([
    supabase
      .from('class_students')
      .select('id, student_number, name')
      .eq('teacher_id', user.id)
      .order('student_number', { ascending: true }),
    supabase
      .from('badges')
      .select('id, name, description, image_url, acquisition_hint')
      .eq('badge_type', 'manual')
      .order('sort_order', { ascending: true }),
  ])

  const students = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    studentNumber: s.student_number ?? 0,
    name: s.name ?? '',
  }))
  const badges = (badgesRes.data ?? []).map((b) => ({
    id: b.id,
    name: b.name ?? '',
    description: b.description ?? null,
    image_url: b.image_url ?? '',
    acquisition_hint: b.acquisition_hint ?? null,
  }))

  return (
    <main className="container">
      <TeacherBadgeGrant students={students} badges={badges} />
    </main>
  )
}
