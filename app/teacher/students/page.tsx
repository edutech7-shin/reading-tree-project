import { createSupabaseServerClient } from '../../../lib/supabase/server'
import CreateStudentWrapper from './CreateStudentWrapper'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const supabase = createSupabaseServerClient()
  
  // 교사 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  let isTeacher = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    isTeacher = profile?.role === 'teacher'
  }

  const { data: students } = await supabase
    .from('profiles')
    .select('id, nickname, role, level, points')
    .eq('role', 'student')
    .order('nickname', { ascending: true })

  // 각 학생의 승인된 독서 기록 수(잎사귀) 가져오기
  const studentsWithLeaves = await Promise.all(
    (students ?? []).map(async (student) => {
      const { count } = await supabase
        .from('book_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', student.id)
        .eq('status', 'approved')
      return {
        ...student,
        leaves: count ?? 0
      }
    })
  )

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>학생 관리</h1>
        {isTeacher && (
          <CreateStudentWrapper />
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {studentsWithLeaves.map((s) => (
          <div className="card" key={s.id}>
            <div style={{ fontWeight: 600 }}>{s.nickname}</div>
            <div>레벨: {s.level}</div>
            <div>잎사귀: 🍃 {s.leaves}개</div>
            <div>물방울: 💧 {s.points}점</div>
          </div>
        ))}
        {studentsWithLeaves.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24, color: '#999' }}>
            등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </main>
  )
}


