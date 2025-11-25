import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
import { StudentMissionsDashboard } from './StudentMissionsDashboard'

export const dynamic = 'force-dynamic'

export default async function StudentMissionsPage() {
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
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return (
      <main className='container'>
        <div className="card">
          <p>프로필 정보를 불러올 수 없습니다.</p>
        </div>
      </main>
    )
  }

  if (!profile) {
    redirect('/')
  }

  // role이 'student'가 아니면 리다이렉트
  const normalizedRole = (profile.role ?? '').trim().toLowerCase()
  if (normalizedRole !== 'student') {
    redirect('/')
  }

  // 학생의 class_students 레코드 찾기 (name으로 매칭)
  const { data: studentRecord, error: studentRecordError } = await supabase
    .from('class_students')
    .select('id, name, student_number')
    .eq('name', profile.name)
    .limit(1)
    .maybeSingle()

  if (studentRecordError) {
    console.error('[StudentMissionsPage] Student record error:', studentRecordError)
  }

  if (!studentRecord) {
    return (
      <main className='container'>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>학생 정보를 찾을 수 없습니다</h3>
          <p style={{ color: '#666', fontSize: 'var(--font-size-sm)' }}>
            이름: {profile.name}<br />
            역할: {profile.role}
          </p>
          <p style={{ color: '#666', fontSize: 'var(--font-size-sm)', marginTop: 12 }}>
            교사가 학생을 반에 등록해야 미션을 받을 수 있습니다.
          </p>
        </div>
      </main>
    )
  }

  // 할당된 미션 가져오기
  const { data: assignmentsRaw, error: assignmentsError } = await supabase
    .from('mission_assignments')
    .select(`
      id,
      mission_id,
      start_date,
      end_date,
      status,
      assigned_at,
      completed_at,
      missions (
        id,
        title,
        description,
        type,
        verification_method,
        book_title,
        book_author,
        mission_content,
        points
      )
    `)
    .eq('student_id', studentRecord.id)
    .order('assigned_at', { ascending: false })

  if (assignmentsError) {
    throw new Error('미션 정보를 불러올 수 없습니다.')
  }

  // Supabase 관계 쿼리 결과를 타입에 맞게 변환
  const assignments = (assignmentsRaw || []).map((a: any) => ({
    id: a.id,
    mission_id: a.mission_id,
    start_date: a.start_date,
    end_date: a.end_date,
    status: a.status,
    assigned_at: a.assigned_at,
    completed_at: a.completed_at,
    missions: Array.isArray(a.missions) ? a.missions[0] : a.missions
  })).filter((a: any) => a.missions) // missions가 없는 경우 필터링

  // 완료 기록 가져오기
  const assignmentIds = (assignments || []).map(a => a.id)
  let completionsMap: Record<number, any> = {}

  if (assignmentIds.length > 0) {
    const { data: completions } = await supabase
      .from('mission_completions')
      .select('assignment_id, verification_status, points_awarded, completed_at, verified_at')
      .in('assignment_id', assignmentIds)

    completionsMap = (completions || []).reduce((acc, c) => {
      acc[c.assignment_id] = c
      return acc
    }, {} as Record<number, any>)
  }

  return (
    <main className='container'>
      <StudentMissionsDashboard 
        assignments={assignments || []} 
        completionsMap={completionsMap}
        studentId={studentRecord.id}
      />
    </main>
  )
}

