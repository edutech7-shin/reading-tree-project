import { createSupabaseServerClient } from '../../lib/supabase/server'
export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="container">
        <h1>내 나무</h1>
        <p>로그인이 필요합니다. 상단의 로그인 메뉴를 이용해주세요.</p>
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role, level, points')
    .eq('id', user.id)
    .maybeSingle()

  const { count: approvedCount } = await supabase
    .from('book_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved')

  return (
    <main className="container">
      <h1>내 나무</h1>
      <div className="card">
        <div>이름: {profile?.nickname ?? '(미설정)'}</div>
        <div>역할: {profile?.role ?? 'student'}</div>
        <div>개인 레벨: {profile?.level ?? 1}</div>
        <div>내 잎사귀: {approvedCount ?? 0}</div>
        <div>내 물방울: {profile?.points ?? 0}</div>
      </div>
    </main>
  )
}


