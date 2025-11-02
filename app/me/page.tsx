import { createSupabaseServerClient } from '../../lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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

  let profile: {
    nickname: string
    role: 'student' | 'teacher'
    level: number
    points: number
  } | null = null
  let profileError: unknown = null

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRole) {
      throw new Error('Supabase 서비스 롤 키가 설정되어 있지 않습니다.')
    }

    const adminClient = createClient(url, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data, error } = await adminClient
      .from('profiles')
      .select('nickname, role, level, points')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      profileError = error
    } else {
      profile = data
    }
  } catch (error) {
    profileError = error
  }

  const { count: approvedCount } = await supabase
    .from('book_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved')

  if (!profile) {
    console.warn('[MyPage] Profile missing or failed to load:', profileError)
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
