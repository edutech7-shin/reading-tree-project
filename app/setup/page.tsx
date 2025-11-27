'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
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

      // 프로필이 있는지 확인
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[Setup] Profile check error:', error)
        // 에러가 있어도 계속 진행 (프로필이 없을 수 있음)
      }

      // 프로필이 있고 status가 'active' 또는 'approved'이면 /me로 리다이렉트
      if (profile) {
        const normalizedStatus = (profile.status ?? '').trim().toLowerCase()
        const effectiveStatus = normalizedStatus && ['active', 'approved', 'pending', 'suspended'].includes(normalizedStatus)
          ? normalizedStatus
          : 'active'
        
        // 'pending' 또는 'suspended'가 아니면 정상 사용 가능
        if (effectiveStatus !== 'pending' && effectiveStatus !== 'suspended') {
          router.push('/me')
          return
        }
      }

      setChecking(false)
    }
    load()
  }, [router])

  if (checking) {
    return (
      <main className="container" style={{ maxWidth: 480 }}>
        <h1>확인 중...</h1>
        <div className="card">
          <p>프로필을 확인하고 있습니다...</p>
        </div>
      </main>
    )
  }

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
          책장으로 돌아가기
        </button>
      </div>
    </main>
  )
}
