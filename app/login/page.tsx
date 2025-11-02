'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function persistSession(accessToken: string, refreshToken: string | null | undefined) {
    try {
      const base = window.location.origin.replace(/\/$/, '')
      const callbackUrl = `${base}/auth/callback`

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          refreshToken: refreshToken ?? ''
        }),
        credentials: 'include',
        cache: 'no-store'
      })
      const result = await response.json()
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || '세션 저장에 실패했습니다.')
      }
      return typeof result.redirectUrl === 'string' ? result.redirectUrl : '/me'
    } catch (fetchError) {
      console.error('[Login] Failed to persist session:', fetchError)
      setError('로그인 세션을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
      return null
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const message = error.message || '로그인 중 오류가 발생했습니다.'
      if (message.toLowerCase().includes('email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다. 받은 인증 메일을 열어주세요.')
      } else if (message.toLowerCase().includes('invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError(message)
      }
      setLoading(false)
      return
    }

    const session = data?.session ?? (await supabase.auth.getSession()).data.session
    if (!session) {
      console.error('[Login] Session missing after sign-in')
      setError('로그인 세션을 찾을 수 없습니다. 다시 시도해주세요.')
      setLoading(false)
      await supabase.auth.signOut()
      return
    }

    const redirectUrl = await persistSession(session.access_token, session.refresh_token)
    setLoading(false)

    if (!redirectUrl) {
      await supabase.auth.signOut()
      return
    }

    window.location.href = redirectUrl
  }

  async function onLogout() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    try {
      const base = window.location.origin.replace(/\/$/, '')
      const callbackUrl = `${base}/auth/callback`
      const response = await fetch(callbackUrl, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store'
      })
      if (!response.ok) {
        console.warn('[Login] Failed to clear server session')
      }
    } catch (logoutError) {
      console.warn('[Login] Logout sync error:', logoutError)
    }
    window.location.reload()
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>

      {error && <div style={{ color: 'crimson', marginBottom: 16 }}>{error}</div>}

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

      <p style={{ marginTop: 24, fontSize: 13, color: '#666' }}>
        ※ 현재는 이메일과 비밀번호 로그인만 지원합니다.
      </p>
    </main>
  )
}
