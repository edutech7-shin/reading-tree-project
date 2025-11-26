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

  // 최근 우리 반 친구들이 읽은 책 목록 가져오기 (승인된 독서 기록 기준, 최근 승인 순, 9권)
  const { data: readBooks } = await supabase
    .from('book_records')
    .select(`
      id,
      book_title,
      book_author,
      book_cover_url,
      approved_at,
      profiles!book_records_user_id_fkey (
        name
      )
    `)
    .eq('status', 'approved')
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(9)

  const recentReadBooks = readBooks?.map((record: any) => {
    const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
    return {
      id: record.id,
      title: record.book_title,
      author: record.book_author,
      coverUrl: record.book_cover_url,
      studentName: profile?.name || '알 수 없음',
      approvedAt: record.approved_at
    }
  }).filter((book: any) => book.studentName !== '알 수 없음') || []

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

      {/* 나무 그래픽과 활동 목록을 좌우로 배치 */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 'var(--grid-gap-md)',
        marginTop: 'var(--grid-gap-md)',
        alignItems: 'start'
      }}>
        {/* 왼쪽: 나무 그래픽 */}
        <div>
          <div className="treeWrap">
            <ClassTree level={level} currentLeaves={currentLeaves} targetLeaves={targetLeaves} />
          </div>

          {/* 나무 그래픽 아래: 최근 읽은 책 목록 (가로 3권, 세로 3줄) */}
          {recentReadBooks.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--grid-gap-md)' }}>
              <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>
                📖 최근 우리 반 친구들이 읽은 책
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--grid-gap-sm)'
              }}>
                {recentReadBooks.map((book) => (
                  <div
                    key={book.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: 'var(--grid-gap-xs)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-small)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      textAlign: 'center'
                    }}
                  >
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title || ''}
                        style={{
                          width: '100%',
                          aspectRatio: '3/4',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-small)',
                          marginBottom: 'var(--grid-gap-xs)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        aspectRatio: '3/4',
                        backgroundColor: 'var(--color-border-light)',
                        borderRadius: 'var(--radius-small)',
                        marginBottom: 'var(--grid-gap-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-tertiary)',
                        fontSize: 'var(--font-size-xs)'
                      }}>
                        표지 없음
                      </div>
                    )}
                    <div style={{ width: '100%' }}>
                      <div style={{ 
                        fontWeight: 'var(--font-weight-semibold)', 
                        fontSize: 'var(--font-size-xs)',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.4
                      }}>
                        {book.title || '(제목 없음)'}
                      </div>
                      {book.author && (
                        <div style={{ 
                          fontSize: 'var(--font-size-xs)', 
                          color: 'var(--color-text-secondary)',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {book.author}
                        </div>
                      )}
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--color-text-tertiary)'
                      }}>
                        {book.studentName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 우리 반 나무를 자라게 한 활동 목록 */}
        {recentActivities.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>
              🌱 우리 반 나무를 자라게 한 활동
            </h3>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-xs)', maxHeight: '600px', overflowY: 'auto' }}>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 2 }}>
                      {activity.studentName}
                    </div>
                    <div style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      color: 'var(--color-text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
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
        )}
      </section>
    </main>
  )
}


