import { createSupabaseServerClient } from '../../lib/supabase/server'
export const dynamic = 'force-dynamic'

export default async function TeacherDashboard() {
  const supabase = createSupabaseServerClient()
  const { count: pendingCount } = await supabase
    .from('book_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { data: classTree } = await supabase
    .from('class_trees')
    .select('class_name, current_level, current_leaves, level_up_target')
    .limit(1)
    .maybeSingle()

  return (
    <main className="container">
      <h1>교사 대시보드</h1>
      <div className="card">
        <div>승인 대기: {pendingCount ?? 0}건</div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div>우리 반: {classTree?.class_name ?? '(미설정)'}</div>
        <div>레벨: {classTree?.current_level ?? 1}</div>
        <div>게이지: {classTree?.current_leaves ?? 0} / {classTree?.level_up_target ?? 50}</div>
      </div>
    </main>
  )
}


