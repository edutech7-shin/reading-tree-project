import Link from 'next/link'
import ClassTree from '../components/ClassTree'
import { createSupabaseServerClient } from '../lib/supabase/server'

export const dynamic = 'force-dynamic'

type Activity = {
  id: string
  type: 'book' | 'mission'
  studentName: string
  content: string
  timestamp: string
}

export default async function Home() {
  const supabase = createSupabaseServerClient()
  const { data: classTree } = await supabase
    .from('class_trees')
    .select('class_name, current_level, current_leaves, level_up_target')
    .limit(1)
    .maybeSingle()

  const level = classTree?.current_level ?? 1
  const currentLeaves = classTree?.current_leaves ?? 0
  const targetLeaves = classTree?.level_up_target ?? 50
  const remaining = Math.max(0, targetLeaves - currentLeaves)

  // 우리 반 나무를 자라게 한 활동 가져오기
  const activities: Activity[] = []

  // 1. 승인된 독서 기록 가져오기
  const { data: approvedRecords } = await supabase
    .from('book_records')
    .select(`
      id,
      book_title,
      approved_at,
      profiles!book_records_user_id_fkey (
        name
      )
    `)
    .eq('status', 'approved')
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(20)

  if (approvedRecords) {
    approvedRecords.forEach((record: any) => {
      const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
      if (profile?.name && record.approved_at) {
        activities.push({
          id: `book-${record.id}`,
          type: 'book',
          studentName: profile.name,
          content: record.book_title || '독서 기록',
          timestamp: record.approved_at
        })
      }
    })
  }

  // 2. 완료된 미션 가져오기
  const { data: completedMissions } = await supabase
    .from('mission_completions')
    .select(`
      id,
      completed_at,
      verified_at,
      mission_assignments!mission_completions_assignment_id_fkey (
        missions!mission_assignments_mission_id_fkey (
          title
        )
      ),
      class_students!mission_completions_student_id_fkey (
        name
      )
    `)
    .eq('verification_status', 'approved')
    .order('completed_at', { ascending: false })
    .limit(20)

  if (completedMissions) {
    completedMissions.forEach((completion: any) => {
      // class_students 처리
      const student = Array.isArray(completion.class_students) 
        ? completion.class_students[0] 
        : completion.class_students
      
      // mission_assignments 처리 (배열일 수 있음)
      const assignment = Array.isArray(completion.mission_assignments)
        ? completion.mission_assignments[0]
        : completion.mission_assignments
      
      // missions 처리 (배열일 수 있음)
      const mission = assignment 
        ? (Array.isArray(assignment.missions)
            ? assignment.missions[0]
            : assignment.missions)
        : null
      
      if (student?.name && (completion.verified_at || completion.completed_at)) {
        activities.push({
          id: `mission-${completion.id}`,
          type: 'mission',
          studentName: student.name,
          content: mission?.title || '미션 완료',
          timestamp: completion.verified_at || completion.completed_at
        })
      }
    })
  }

  // 최신 순으로 정렬
  activities.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateB - dateA
  })

  // 최근 20개만 표시
  const recentActivities = activities.slice(0, 20)

  return (
    <main className="container">
      <section className="hero">
        <h1>우리 반 나무</h1>
        <p className="sub">
          {remaining > 0 
            ? `다음 레벨까지 ${remaining}권 남았어요!`
            : '레벨업을 축하해요! 🎉'}
        </p>
      </section>

      <section className="treeWrap">
        <ClassTree level={level} currentLeaves={currentLeaves} targetLeaves={targetLeaves} />
      </section>

      {/* 우리 반 나무를 자라게 한 활동 목록 */}
      {recentActivities.length > 0 && (
        <section style={{ marginTop: 'var(--grid-gap-md)' }}>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>
              🌱 우리 반 나무를 자라게 한 활동
            </h3>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)' }}>
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: 'var(--grid-gap-sm)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-small)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--grid-gap-sm)'
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-lg)' }}>
                    {activity.type === 'book' ? '📚' : '🎯'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 2 }}>
                      {activity.studentName}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {activity.type === 'book' ? '독서 기록 승인' : '미션 완료'}: {activity.content}
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(activity.timestamp).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ctaRow">
        <Link className="btn primary" href="/record">✍️ 독서록</Link>
        <Link className="btn" href="/me">책장 보기</Link>
      </section>
    </main>
  )
}


