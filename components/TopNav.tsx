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

  // 디버깅: 렌더링 시 상태 확인
  useEffect(() => {
    console.log('[TopNav Render] loading:', loading, 'isLoggedIn:', isLoggedIn, 'isTeacher:', isTeacher)
  }, [loading, isLoggedIn, isTeacher])

  useEffect(() => {
    let mounted = true
    
    async function checkAuth() {
      try {
        console.log('[TopNav] checkAuth started')
        const supabase = getSupabaseClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('[TopNav] Session check:', { hasSession: !!session, hasUser: !!session?.user, sessionError, userId: session?.user?.id })
        
        if (!mounted) {
          console.log('[TopNav] Component unmounted, aborting')
          return
        }
        
        setIsLoggedIn(!!session)
        
        // 로그인된 경우 역할 확인
        if (session?.user) {
          console.log('[TopNav] User found, fetching profile...', session.user.id)
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle()
            
            console.log('[TopNav] Profile query result:', { profile, profileError, userId: session.user.id })
            
            if (profileError) {
              console.error('[TopNav] Profile fetch error:', profileError)
            }
            
            const isTeacherRole = profile?.role === 'teacher'
            console.log('[TopNav] User role:', profile?.role, 'role type:', typeof profile?.role, 'isTeacher:', isTeacherRole)
            
            if (mounted) {
              setIsTeacher(isTeacherRole)
              console.log('[TopNav] Set isTeacher to:', isTeacherRole)
            }
          } catch (profileErr) {
            console.error('[TopNav] Profile fetch exception:', profileErr)
            if (mounted) {
              setIsTeacher(false)
            }
          }
        } else {
          console.log('[TopNav] No user session')
          if (mounted) {
            setIsTeacher(false)
          }
        }
      } catch (error) {
        console.error('[TopNav] Auth check failed:', error)
        if (mounted) {
          setIsLoggedIn(false)
          setIsTeacher(false)
        }
      } finally {
        if (mounted) {
          console.log('[TopNav] Setting loading to false')
          setLoading(false)
        }
      }
    }

    checkAuth()

    // 세션 변경 감지를 위한 리스너
    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setIsLoggedIn(!!session)
      
      // 세션 변경 시 역할도 다시 확인
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
          
          console.log('[TopNav] Profile query result (listener):', { profile, profileError, userId: session.user.id })
          
          if (profileError) {
            console.error('[TopNav] Profile fetch error (listener):', profileError)
          }
          
          const isTeacherRole = profile?.role === 'teacher'
          console.log('[TopNav] User role (listener):', profile?.role, 'role type:', typeof profile?.role, 'isTeacher:', isTeacherRole)
          
          if (mounted) {
            setIsTeacher(isTeacherRole)
          }
        } catch (error) {
          console.error('[TopNav] Profile fetch failed:', error)
          if (mounted) {
            setIsTeacher(false)
          }
        }
      } else {
        if (mounted) {
          setIsTeacher(false)
        }
      }
    })

    // 안전장치: 3초 후에도 로딩이 끝나지 않으면 강제로 종료
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[TopNav] Loading timeout, forcing completion')
        setLoading(false)
      }
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
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
        {loading ? (
          <span style={{ color: '#999', fontSize: '14px' }}>로딩...</span>
        ) : (
          <>
            {isLoggedIn && isTeacher && (
              <Link href="/teacher">대시보드</Link>
            )}
            {isLoggedIn ? (
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
          </>
        )}
      </nav>
    </header>
  )
}


