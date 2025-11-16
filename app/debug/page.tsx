'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabaseClient()

      // 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      // 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      // 프로필 확인
      let profile = null
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        profile = data
      }

      setDebugInfo({
        session: session ? {
          access_token: session.access_token ? '있음' : '없음',
          refresh_token: session.refresh_token ? '있음' : '없음',
          expires_at: session.expires_at,
        } : null,
        sessionError,
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        } : null,
        userError,
        profile,
        cookies: document.cookie,
      })
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return <main className="container"><p>로딩 중...</p></main>
  }

  return (
    <main className="container">
      <h1>디버그 정보</h1>

      <div className="card">
        <h3>세션 상태</h3>
        <pre style={{ fontSize: 12, overflow: 'auto', background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/login" className="btn">로그인 페이지로</a>
        <a href="/me" className="btn" style={{ marginLeft: 8 }}>책장으로</a>
      </div>
    </main>
  )
}
