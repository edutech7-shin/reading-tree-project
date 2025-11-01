import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('[OAuth Callback] URL:', requestUrl.toString())
  console.log('[OAuth Callback] Code:', code ? 'present' : 'missing')
  console.log('[OAuth Callback] Error:', error_description)

  // OAuth 에러가 있으면 로그인 페이지로
  if (error_description) {
    console.error('[OAuth Callback] OAuth error:', error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description)}`)
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}/me`)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    console.log('[OAuth Callback] Supabase URL:', url)
    console.log('[OAuth Callback] Anon Key:', anon ? 'present' : 'missing')

    const supabase = createServerClient(
      url,
      anon,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Exchange code for session
    console.log('[OAuth Callback] Exchanging code for session...')
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[OAuth Callback] Exchange error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log('[OAuth Callback] Session created:', sessionData?.session ? 'success' : 'failed')
    console.log('[OAuth Callback] User:', sessionData?.user?.email)

    // 프로필 존재 여부 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      console.log('[OAuth Callback] User confirmed:', user.email)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      console.log('[OAuth Callback] Profile:', profile ? 'exists' : 'not found')

      // 프로필이 없으면 설정 페이지로
      if (!profile) {
        console.log('[OAuth Callback] Redirecting to /setup')
        return NextResponse.redirect(`${origin}/setup`)
      }
    }

    console.log('[OAuth Callback] Redirecting to /me with cookies')
    return response
  }

  // 코드가 없으면 로그인 페이지로
  console.log('[OAuth Callback] No code, redirecting to /login')
  return NextResponse.redirect(`${origin}/login`)
}
