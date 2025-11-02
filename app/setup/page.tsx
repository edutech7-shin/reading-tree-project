'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || null)

      // 이미 프로필이 있는지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        // 프로필이 이미 있으면 내 나무로 이동
        router.push('/me')
      }
    }

    checkUser()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    // 프로필 업데이트 (신규 가입 시 트리거가 기본 레코드를 생성함)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        nickname: nickname,
        role: role,
        level: 1,
        points: 0
      })
      .eq('id', user.id)

    setLoading(false)

    if (updateError) {
      setError(`프로필 저장 실패: ${updateError.message}`)
      return
    }

    // 성공하면 내 나무로 이동
    router.push('/me')
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>프로필 설정</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <p>환영합니다! {userEmail}</p>
        <p style={{ fontSize: 14, marginTop: 8 }}>
          Reading Tree를 시작하기 위해 프로필을 설정해주세요.
        </p>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>닉네임</label>
          <input
            placeholder="홍길동"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>역할</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="radio"
                name="role"
                value="student"
                checked={role === 'student'}
                onChange={(e) => setRole('student')}
              />
              학생
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="radio"
                name="role"
                value="teacher"
                checked={role === 'teacher'}
                onChange={(e) => setRole('teacher')}
              />
              교사
            </label>
          </div>
        </div>

        <button className="btn primary" disabled={loading}>
          {loading ? '설정 중...' : '프로필 생성하기'}
        </button>
      </form>
    </main>
  )
}
