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
    
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      
      // 로그인 성공
      if (data?.user) {
        window.location.href = '/me'
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.')
        setLoading(false)
      }
    } catch (clientError: any) {
      console.error('[Login] Client initialization error:', clientError)
      setError(clientError?.message || 'Supabase 클라이언트 초기화 실패. 환경변수를 확인하세요.')
      setLoading(false)
    }
  }

  async function onGoogleLogin() {
    if (!origin) {
      setError('페이지를 다시 로드해주세요.')
      return
    }
    setError(null)
    
    try {
      const supabase = getSupabaseClient()
      
      // 현재 origin에 맞춰 callback URL 설정
      const redirectUrl = origin.includes('localhost')
        ? 'http://localhost:3000/auth/callback'
        : `${origin}/auth/callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (clientError: any) {
      console.error('[Google Login] Client initialization error:', clientError)
      setError(clientError?.message || '구글 로그인 초기화 실패. 환경변수를 확인하세요.')
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
        <div>
          <label htmlFor="login-email" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>이메일</label>
          <input 
            id="login-email"
            name="email"
            placeholder="이메일" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label htmlFor="login-password" style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>비밀번호</label>
          <input 
            id="login-password"
            name="password"
            placeholder="비밀번호" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
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


