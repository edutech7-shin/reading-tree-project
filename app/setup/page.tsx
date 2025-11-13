'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [name, setName] = useState('')
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

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
        cache: 'no-store'
      })

      const result = await response.json()
      setLoading(false)

      if (!response.ok || !result?.success) {
        setError(`프로필 저장 실패: ${result?.error || '서버 오류가 발생했습니다.'}`)
        return
      }

      // 성공하면 내 나무로 이동
      router.push('/me')
    } catch (apiError) {
      console.error('[Setup] Failed to save profile:', apiError)
      setLoading(false)
      setError('프로필 저장 중 네트워크 오류가 발생했습니다.')
    }
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
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>이름</label>
          <input
            placeholder="홍길동"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <button className="btn primary" disabled={loading}>
          {loading ? '설정 중...' : '프로필 생성하기'}
        </button>
      </form>
    </main>
  )
}
