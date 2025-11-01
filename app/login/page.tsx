'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else window.location.href = '/me'
  }

  async function onGoogleLogin() {
    if (!origin) {
      setError('페이지를 다시 로드해주세요.')
      return
    }
    setError(null)
    const supabase = getSupabaseClient()

    // 프로덕션 URL 사용 - callback 라우트로 리다이렉트
    const redirectUrl = origin.includes('localhost')
      ? 'http://localhost:3000/auth/callback'
      : 'https://reading-tree-project.vercel.app/auth/callback'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    if (error) setError(error.message)
  }

  async function onLogout() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>}

      <button
        className="btn primary"
        onClick={onGoogleLogin}
        disabled={!origin}
        style={{ marginBottom: 16, width: '100%' }}
      >
        🔐 Google로 로그인
      </button>

      <div style={{ textAlign: 'center', margin: '16px 0', color: '#666' }}>또는</div>

      <form onSubmit={onLogin} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={loading}>
          {loading ? '로그인 중...' : '이메일로 로그인'}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        계정이 없으신가요? <Link href="/signup" style={{ color: '#0070f3', textDecoration: 'underline' }}>회원가입</Link>
      </p>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className="btn" onClick={onLogout}>로그아웃</button>
        <Link className="btn" href="/">메인으로</Link>
      </div>
    </main>
  )
}


