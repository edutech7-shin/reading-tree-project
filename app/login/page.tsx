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
    if (error) {
      const message = error.message || '로그인 중 오류가 발생했습니다.'
      if (message.toLowerCase().includes('email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 열어주세요.')
      } else if (message.toLowerCase().includes('invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError(message)
      }
    } else {
      window.location.href = '/me'
    }
  }

  async function onGoogleLogin() {
    console.log('[Login] Google login clicked')
    console.log('[Login] Origin:', origin)

    if (!origin) {
      console.error('[Login] Origin not loaded')
      setError('페이지를 다시 로드해주세요.')
      return
    }

    setError(null)
    console.log('[Login] Getting Supabase client...')

    try {
      const supabase = getSupabaseClient()
      console.log('[Login] Supabase client created')

      const redirectUrl = origin.includes('localhost')
        ? 'http://localhost:3000/auth/callback'
        : `${origin}/auth/callback`

      console.log('[Login] Redirect URL:', redirectUrl)
      console.log('[Login] Starting OAuth...')

      // Supabase JS 2.78 typings에는 flowType이 누락되어 있어 any 캐스팅으로 PKCE를 강제한다.
      const { data, error } = await (supabase.auth as any).signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        },
        flowType: 'pkce'
      })

      console.log('[Login] OAuth response:', { data, error })

      if (error) {
        console.error('[Login] OAuth error:', error)
        setError(error.message)
      } else {
        console.log('[Login] OAuth started successfully')
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err)
      setError('로그인 중 오류가 발생했습니다.')
    }
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
