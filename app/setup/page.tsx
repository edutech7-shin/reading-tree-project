'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || null)
    }
    load()
  }, [router])

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <h1>승인 대기 중</h1>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <p>환영합니다! {userEmail}</p>
        <p style={{ fontSize: 14 }}>
          관리자 승인 후 Reading Tree를 이용할 수 있습니다. 승인 완료 시 이메일로 안내드릴게요.
        </p>
        <button
          className="btn primary"
          onClick={() => router.push('/me')}
          style={{ justifySelf: 'start' }}
        >
          내 나무로 돌아가기
        </button>
      </div>
    </main>
  )
}
