'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)

    // OAuth 콜백 처리 (Implicit Flow - 해시 프래그먼트)
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        console.log('[Signup] OAuth callback detected (Implicit Flow)')
        const supabase = getSupabaseClient()

        // 세션 설정
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (error) {
          console.error('[Signup] Session set error:', error)
          setError(error.message)
        } else {
          console.log('[Signup] Session set successfully, redirecting to /setup')
          // 프로필 설정 페이지로 이동
          window.location.href = '/setup'
        }
      }
    }

    handleOAuthCallback()
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

    // 프로덕션 URL 사용 - callback 라우트로 리다이렉트
    const redirectUrl = origin.includes('localhost')
      ? 'http://localhost:3000/auth/callback'
      : 'https://reading-tree-project.vercel.app/auth/callback'

    // 회원가입
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nickname: nickname,
          role: role
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
    setNickname('')
  }

  async function onGoogleSignup() {
    if (!origin) {
      setError('페이지를 다시 로드해주세요.')
      return
    }
    setError(null)
    const supabase = getSupabaseClient()

    // Implicit Flow 사용 - 회원가입 페이지로 리다이렉트
    const redirectUrl = origin.includes('localhost')
      ? 'http://localhost:3000/signup'
      : 'https://reading-tree-project.vercel.app/signup'

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    if (error) setError(error.message)
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

      <button
        className="btn primary"
        onClick={onGoogleSignup}
        disabled={!origin}
        style={{ marginBottom: 16, width: '100%' }}
      >
        🔐 Google로 가입하기
      </button>

      <div style={{ textAlign: 'center', margin: '16px 0', color: '#666' }}>또는</div>

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
          {loading ? '가입 중...' : '이메일로 가입하기'}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        이미 계정이 있으신가요? <Link href="/login" style={{ color: '#0070f3', textDecoration: 'underline' }}>로그인</Link>
      </p>

      <div style={{ marginTop: 16 }}>
        <Link className="btn" href="/">메인으로</Link>
      </div>
    </main>
  )
}
