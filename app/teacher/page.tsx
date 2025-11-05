import { createSupabaseServerClient } from '../../lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import TreeSettings from '../../components/TreeSettings'

export const dynamic = 'force-dynamic'

export default async function TeacherDashboard() {
  const supabase = createSupabaseServerClient()
  
  // 교사 권한 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  if (profile?.role !== 'teacher') {
    redirect('/me')
  }
  
  const { count: pendingCount } = await supabase
    .from('book_records')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { data: classTree } = await supabase
    .from('class_trees')
    .select('id, class_name, current_level, current_leaves, level_up_target')
    .limit(1)
    .maybeSingle()

  return (
    <main className="container">
      <h1>교사 대시보드</h1>
      
      <div className="card">
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          ⏰ 확인이 필요한 기록: <span style={{ color: '#d32f2f' }}>{pendingCount ?? 0}건</span>
        </div>
        {pendingCount && pendingCount > 0 && (
          <Link href="/teacher/approve" className="btn primary" style={{ marginTop: 8, display: 'inline-block' }}>
            승인하러 가기 →
          </Link>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>우리 반 나무</h3>
        <div>반 이름: {classTree?.class_name ?? '(미설정)'}</div>
        <div>현재 레벨: {classTree?.current_level ?? 1}</div>
        <div>현재 잎사귀: {classTree?.current_leaves ?? 0} / {classTree?.level_up_target ?? 50}</div>
      </div>

      {classTree && (
        <div className="card" style={{ marginTop: 12 }}>
          <TreeSettings 
            treeId={classTree.id}
            currentTarget={classTree.level_up_target}
            className={classTree.class_name}
          />
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href="/teacher/approve" className="btn">독서 기록 승인</Link>
        <Link href="/teacher/students" className="btn">학생 관리</Link>
      </div>
    </main>
  )
}


