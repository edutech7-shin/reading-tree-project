'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../lib/supabase/client'

export default function TopNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)
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
              // 프로필 조회 실패 시 false로 설정
              if (mounted) {
                setIsTeacher(false)
              }
              return
            }
            
            // 프로필이 없는 경우도 처리
            if (!profile) {
              console.warn('[TopNav] Profile not found for user:', session.user.id)
              if (mounted) {
                setIsTeacher(false)
              }
              return
            }
            
            const rawRole = typeof profile?.role === 'string' ? profile.role.trim().toLowerCase() : null
            const isTeacherRole = rawRole === 'teacher'
            console.log('[TopNav] User role:', profile?.role, 'normalized:', rawRole, 'isTeacher:', isTeacherRole)
            
            if (mounted) {
              setIsTeacher(isTeacherRole)
              setUserRole(rawRole)
              setProfileChecked(true)
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
      
      console.log('[TopNav] Auth state changed:', event, 'hasSession:', !!session)
      
      // SIGNED_OUT 이벤트 시에만 상태 초기화
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        setIsTeacher(false)
        setProfileChecked(false)
        return
      }
      
      setIsLoggedIn(!!session)
      
      // 세션 변경 시 역할도 다시 확인 (초기 로드가 완료된 후에만)
      if (session?.user && profileChecked) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle()
          
          console.log('[TopNav] Profile query result (listener):', { profile, profileError, userId: session.user.id })
          
          if (profileError) {
            console.error('[TopNav] Profile fetch error (listener):', profileError)
            // 프로필 조회 실패 시 재시도하지 않고 false로 설정
            if (mounted) {
              setIsTeacher(false)
            }
            return
          }
          
          // 프로필이 없는 경우도 처리
          if (!profile) {
            console.warn('[TopNav] Profile not found for user:', session.user.id)
            if (mounted) {
              setIsTeacher(false)
            }
            return
          }
          
          const rawRole = typeof profile?.role === 'string' ? profile.role.trim().toLowerCase() : null
          const isTeacherRole = rawRole === 'teacher'
          console.log('[TopNav] User role (listener):', profile?.role, 'normalized:', rawRole, 'isTeacher:', isTeacherRole)
          
          if (mounted) {
            setIsTeacher(isTeacherRole)
            setUserRole(rawRole)
            setProfileChecked(true)
          }
        } catch (error) {
          console.error('[TopNav] Profile fetch failed:', error)
          if (mounted) {
            setIsTeacher(false)
          }
        }
      } else {
        console.log('[TopNav] No session in listener')
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
      console.log('[TopNav] Logout initiated')
      
      // 서버 사이드 로그아웃 API 호출
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('[TopNav] Logout API error:', result.error)
        // API 실패 시 클라이언트 사이드에서도 시도
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
      }
      
      console.log('[TopNav] Logout successful, redirecting...')
      setIsLoggedIn(false)
      setIsTeacher(false)
      // 페이지 전체 새로고침으로 세션 상태 완전히 초기화
      window.location.href = '/'
    } catch (error) {
      console.error('[TopNav] Logout failed:', error)
      // 에러 발생 시에도 강제로 리다이렉트
      try {
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
      } catch (signOutError) {
        console.error('[TopNav] signOut fallback failed:', signOutError)
      }
      window.location.href = '/'
    }
  }

  return (
    <header className="topnav">
      <nav>
        <Link href="/">우리 반 나무</Link>
        <Link href="/record">기록하기</Link>
        <Link href="/me">내 책나무</Link>
        {!loading && isLoggedIn && userRole === 'admin' && (
          <Link href="/admin/dashboard">관리자</Link>
        )}
        {!loading && isLoggedIn && isTeacher && (
          <Link href="/teacher">대시보드</Link>
        )}
        <span className="spacer" />
        {loading ? (
          <span className="text-tertiary" style={{ fontSize: 'var(--font-size-sm)' }}>로딩...</span>
        ) : isLoggedIn ? (
          <button
            onClick={handleLogout}
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


