'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../lib/supabase/client'

export default function TopNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsLoggedIn(!!session)
        
        // 로그인된 경우 역할 확인
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
          
          setIsTeacher(profile?.role === 'teacher')
        } else {
          setIsTeacher(false)
        }
      } catch (error) {
        console.error('[TopNav] Auth check failed:', error)
        setIsLoggedIn(false)
        setIsTeacher(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // 세션 변경 감지를 위한 리스너
    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session)
      
      // 세션 변경 시 역할도 다시 확인
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
          
          setIsTeacher(profile?.role === 'teacher')
        } catch (error) {
          console.error('[TopNav] Profile fetch failed:', error)
          setIsTeacher(false)
        }
      } else {
        setIsTeacher(false)
      }
      
      // 리스너에서도 로딩 상태 업데이트 (초기 로딩이 완료된 후라도)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setIsLoggedIn(false)
      setIsTeacher(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('[TopNav] Logout failed:', error)
    }
  }

  return (
    <header className="topnav">
      <nav>
        <Link href="/">우리 반 나무</Link>
        <Link href="/record">기록하기</Link>
        <Link href="/me">내 나무</Link>
        <span className="spacer" />
        {isLoggedIn && isTeacher && (
          <Link href="/teacher">대시보드</Link>
        )}
        {loading ? (
          <span style={{ color: '#999', fontSize: '14px' }}>로딩...</span>
        ) : isLoggedIn ? (
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#111',
              textDecoration: 'none',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              padding: 0
            }}
            className="nav-link"
          >
            로그아웃
          </button>
        ) : (
          <Link href="/login">로그인</Link>
        )}
      </nav>
    </header>
  )
}


