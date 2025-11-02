'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        cache: 'no-store'
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        const message = result?.error || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
        setError(message)
        setLoading(false)
        return
      }

      const redirectUrl = typeof result.redirectUrl === 'string' ? result.redirectUrl : '/me'
      window.location.href = redirectUrl
    } catch (fetchError) {
      console.error('[Login] unexpected error:', fetchError)
      setError('로그인 도중 오류가 발생했습니다. 네트워크 상태를 확인해주세요.')
      setLoading(false)
    }
  }

  async function onLogout() {
    setError(null)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      })
    } catch (logoutError) {
      console.warn('[Login] logout error:', logoutError)
    } finally {
      window.location.reload()
    }
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>}

      <form onSubmit={onLogin} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button className="btn primary" disabled={loading}>
          {loading ? '로그인 중...' : '이메일로 로그인'}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        계정이 없으신가요? <Link href="/signup" style={{ color: '#0070f3', textDecoration: 'underline' }}>회원가입</Link>
      </p>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn" type="button" onClick={onLogout}>로그아웃</button>
        <Link className="btn" href="/">메인으로</Link>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: '#666' }}>
        ※ 현재는 이메일과 비밀번호 로그인만 지원합니다.
      </p>
    </main>
  )
}
