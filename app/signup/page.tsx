'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  async function onSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!origin) {
      setError('페이지를 다시 로드해주세요.')
      return
    }

    setError(null)
    setSuccess(false)
    setLoading(true)

    const supabase = getSupabaseClient()

    const redirectUrl = origin.includes('localhost')
      ? 'http://localhost:3000/auth/callback'
      : `${origin}/auth/callback`

    // 회원가입
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role: 'teacher'
        }
      }
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // 회원가입 성공
    setSuccess(true)
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>회원가입</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>}
      {success && (
        <div style={{ color: 'green', marginBottom: 16 }}>
          회원가입이 완료되었습니다! 이메일을 확인하여 계정을 인증해주세요.
        </div>
      )}

      <form onSubmit={onSignup} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>이메일</label>
          <input
            placeholder="example@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>비밀번호</label>
          <input
            placeholder="최소 6자 이상"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

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
          {loading ? '가입 중...' : '이메일로 가입하기'}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        이미 계정이 있으신가요? <Link href="/login" style={{ color: '#0070f3', textDecoration: 'underline' }}>로그인</Link>
      </p>

      <p style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
        ※ 현재는 이메일과 비밀번호 회원가입만 지원합니다.
      </p>

      <div style={{ marginTop: 16 }}>
        <Link className="btn" href="/">메인으로</Link>
      </div>
    </main>
  )
}
