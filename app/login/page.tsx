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

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else window.location.href = '/'
  }

  async function onLogout() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>로그인</h1>
      <form onSubmit={onLogin} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button className="btn primary" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={onLogout}>로그아웃</button>
      </div>
      <p style={{ marginTop: 12 }}>
        <Link className="btn" href="/">메인으로</Link>
      </p>
    </main>
  )
}


