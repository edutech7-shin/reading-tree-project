'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../lib/supabase/client'

export default function TopNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsLoggedIn(!!session)
      } catch (error) {
        console.error('[TopNav] Auth check failed:', error)
        setIsLoggedIn(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // 세션 변경 감지를 위한 리스너
    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
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
        <Link href="/teacher">교사용</Link>
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


