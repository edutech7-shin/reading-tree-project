import { createSupabaseServerClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MissionsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 프로필 정보 가져오기
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return (
      <main className="container">
        <h1>미션</h1>
        <p>프로필 정보를 불러올 수 없습니다.</p>
      </main>
    )
  }

  // 학생인 경우에만 class_students에서 자신의 ID 찾기
  let studentId: string | null = null
  if (profile.role === 'student' && profile.name) {
    const { data: classStudent, error: classStudentError } = await supabase
      .from('class_students')
      .select('id')
      .eq('name', profile.name)
      .limit(1)
      .maybeSingle()

    if (classStudentError) {
      console.error('[Missions] Error fetching class_students:', classStudentError)
    }

    if (!classStudentError && classStudent) {
      studentId = classStudent.id
      console.log('[Missions] Found studentId:', studentId, 'for name:', profile.name)
    } else {
      console.log('[Missions] No class_students found for name:', profile.name)
    }
  }

  // 미션 할당 정보 가져오기
  let missions: any[] = []
  if (studentId) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('mission_assignments')
      .select(`
        id,
        status,
        start_date,
        end_date,
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
          points,
          is_active
        )
      `)
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false })

    if (!assignmentsError && assignments) {
      missions = assignments.map((assignment: any) => ({
        assignmentId: assignment.id,
        status: assignment.status,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        assignedAt: assignment.assigned_at,
        completedAt: assignment.completed_at,
        mission: assignment.missions
      }))
    }
  }

  // 미션 완료 정보 가져오기
  const { data: completions, error: completionsError } = studentId ? await supabase
    .from('mission_completions')
    .select('assignment_id, verification_status, completed_at, points_awarded')
    .eq('student_id', studentId) : { data: null, error: null }

  const completionMap = new Map()
  if (completions && !completionsError) {
    completions.forEach((completion: any) => {
      completionMap.set(completion.assignment_id, completion)
    })
  }

  // 각 미션에 완료 정보 추가
  missions = missions.map((mission) => {
    const completion = completionMap.get(mission.assignmentId)
    return {
      ...mission,
      completion: completion || null
    }
  })

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 상태 한글 변환
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '진행 중',
      completed: '완료',
      expired: '만료',
      cancelled: '취소됨'
    }
    return statusMap[status] || status
  }

  // 검증 상태 한글 변환
  const getVerificationStatusText = (status: string | null) => {
    if (!status) return '-'
    const statusMap: Record<string, string> = {
      pending: '검증 대기',
      approved: '승인됨',
      rejected: '반려됨'
    }
    return statusMap[status] || status
  }

  return (
    <main className="container">
      <h1>미션</h1>

      {!studentId ? (
        <div className="card" style={{ marginTop: 'var(--grid-gap-md)' }}>
          <p>학급에 등록되지 않은 학생입니다. 교사에게 문의해주세요.</p>
        </div>
      ) : missions.length === 0 ? (
        <div className="card" style={{ marginTop: 'var(--grid-gap-md)' }}>
          <p>현재 할당된 미션이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--grid-gap-md)', marginTop: 'var(--grid-gap-md)' }}>
          {missions.map((mission) => (
            <div key={mission.assignmentId} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--grid-gap-sm)' }}>
                <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                  {mission.mission?.title || '제목 없음'}
                </h2>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-small)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    backgroundColor:
                      mission.status === 'completed'
                        ? 'var(--color-success-light)'
                        : mission.status === 'active'
                        ? 'var(--color-primary-light)'
                        : 'var(--color-tertiary-light)',
                    color:
                      mission.status === 'completed'
                        ? 'var(--color-success)'
                        : mission.status === 'active'
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)'
                  }}
                >
                  {getStatusText(mission.status)}
                </span>
              </div>

              {mission.mission?.description && (
                <p style={{ marginTop: 0, marginBottom: 'var(--grid-gap-xs)', color: 'var(--color-text-secondary)' }}>
                  {mission.mission.description}
                </p>
              )}

              {mission.mission?.type === 'book_reading' && mission.mission?.book_title && (
                <div style={{ marginTop: 'var(--grid-gap-xs)', marginBottom: 'var(--grid-gap-xs)' }}>
                  <strong>도서:</strong> {mission.mission.book_title}
                  {mission.mission.book_author && ` - ${mission.mission.book_author}`}
                </div>
              )}

              {mission.mission?.mission_content && (
                <div style={{ marginTop: 'var(--grid-gap-xs)', marginBottom: 'var(--grid-gap-xs)' }}>
                  <strong>미션 내용:</strong>
                  <p style={{ marginTop: 'var(--grid-gap-xs)', whiteSpace: 'pre-wrap' }}>
                    {mission.mission.mission_content}
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)', marginTop: 'var(--grid-gap-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--grid-gap-md)' }}>
                  <div>
                    <strong>시작일:</strong> {formatDate(mission.startDate)}
                  </div>
                  <div>
                    <strong>종료일:</strong> {formatDate(mission.endDate)}
                  </div>
                </div>
                <div>
                  <strong>보상:</strong> {mission.mission?.points || 0} 포인트
                </div>
                {mission.completion && (
                  <div style={{ marginTop: 'var(--grid-gap-xs)' }}>
                    <div>
                      <strong>완료일:</strong> {formatDate(mission.completion.completed_at)}
                    </div>
                    <div>
                      <strong>검증 상태:</strong> {getVerificationStatusText(mission.completion.verification_status)}
                    </div>
                    {mission.completion.points_awarded > 0 && (
                      <div>
                        <strong>획득 포인트:</strong> {mission.completion.points_awarded} 포인트
                      </div>
                    )}
                  </div>
                )}
              </div>

              {mission.status === 'active' && !mission.completion && (
                <div style={{ marginTop: 'var(--grid-gap-sm)' }}>
                  <Link
                    href={`/missions/${mission.assignmentId}/complete`}
                    className="btn primary"
                    style={{ display: 'inline-block' }}
                  >
                    미션 완료하기
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

