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

  // 프로필이 없으면 설정 페이지로 리다이렉트
  if (!profile) {
    return (
      <main className="container">
        <h1>내 나무</h1>
        <div className="card">
          <p>이메일: {user.email}</p>
          <p style={{ color: 'orange', marginTop: 12 }}>
            ⚠️ 프로필이 생성되지 않았습니다.
          </p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            역할(학생/교사)과 닉네임을 설정해주세요.
          </p>
          <a href="/setup" className="btn primary" style={{ marginTop: 16, display: 'inline-block' }}>
            프로필 설정하기
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      <h1>내 나무</h1>
      <div className="card">
        <div>이메일: {user.email}</div>
        <div>이름: {profile.nickname}</div>
        <div>역할: {profile.role === 'teacher' ? '교사' : '학생'}</div>
        <div>개인 레벨: {profile.level}</div>
        <div>내 잎사귀: {approvedCount ?? 0}개</div>
        <div>내 물방울: {profile.points}점</div>
      </div>
    </main>
  )
}


