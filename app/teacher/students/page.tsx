import { createSupabaseServerClient } from '../../../lib/supabase/server'

export default async function StudentsPage() {
  const supabase = createSupabaseServerClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, nickname, role, level, points')
    .eq('role', 'student')
    .order('nickname', { ascending: true })

  return (
    <main className="container">
      <h1>학생 관리</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {(students ?? []).map((s) => (
          <div className="card" key={s.id}>
            <div style={{ fontWeight: 600 }}>{s.nickname}</div>
            <div>레벨: {s.level}</div>
            <div>물방울: {s.points}</div>
          </div>
        ))}
      </div>
    </main>
  )
}


