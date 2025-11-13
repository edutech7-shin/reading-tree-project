import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getEnv(key: string) {
  const raw = process.env[key]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new Error(`[OAuth Callback] Missing environment variable: ${key}`)
  }
  return value
}

function createSupabaseWithCookies(response: NextResponse): SupabaseClient {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  console.log('[OAuth Callback] Supabase URL:', url)
  console.log('[OAuth Callback] Anon Key:', anon ? 'present' : 'missing')

  return createServerClient(
    url,
    anon,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
}

async function finalizeSession(origin: string, supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[OAuth Callback] Session exists but user is missing')
    return { redirectUrl: `${origin}/login?error=${encodeURIComponent('세션을 확인하지 못했습니다.')}` }
  }

  console.log('[OAuth Callback] User confirmed:', user.email)

  let redirectTarget = `${origin}/me`
  let lookupError: any = null

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.')
    }
    const adminClient = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      lookupError = error
    } else {
      if (profile?.role === 'admin') {
        redirectTarget = `${origin}/admin/dashboard`
      }
    }
  } catch (serviceError) {
    lookupError = serviceError
  }

  if (lookupError) {
    console.warn('[OAuth Callback] Profile lookup failed, defaulting to /me:', lookupError)
    return { redirectUrl: `${origin}/me` }
  }

  return { redirectUrl: redirectTarget }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('[OAuth Callback] URL:', requestUrl.toString())
  console.log('[OAuth Callback] Code:', code ? 'present' : 'missing')
  console.log('[OAuth Callback] Error:', error_description)

  if (error_description) {
    console.error('[OAuth Callback] OAuth error:', error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description)}`)
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}/me`)

    try {
      const supabase = createSupabaseWithCookies(response)
      console.log('[OAuth Callback] Exchanging code for session...')
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[OAuth Callback] Exchange error:', exchangeError)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
      }

      const { redirectUrl } = await finalizeSession(origin, supabase)
      response.headers.set('Location', redirectUrl)
      console.log('[OAuth Callback] Redirecting to', redirectUrl)
      return response
    } catch (error: any) {
      console.error('[OAuth Callback] Unexpected error during code exchange:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('세션 생성 중 오류가 발생했습니다.')}`)
    }
  }

  console.log('[OAuth Callback] No code supplied, expecting hash tokens')
  const html = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charSet="utf-8" />
    <title>로그인 처리 중...</title>
    <meta http-equiv="refresh" content="5;url=${origin}/login" />
  </head>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px;">
    <p>로그인 정보를 확인하는 중입니다. 잠시만 기다려주세요...</p>
    <script>
      (async () => {
        const hash = window.location.hash ? window.location.hash.substring(1) : ''
        if (!hash) {
          window.location.replace('${origin}/login?error=' + encodeURIComponent('세션 토큰이 전달되지 않았습니다.'))
          return
        }
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') || ''
        const type = params.get('type') || ''
        const next = params.get('redirect_to') || params.get('next') || ''

        if (!accessToken) {
          window.location.replace('${origin}/login?error=' + encodeURIComponent('세션 토큰이 전달되지 않았습니다.'))
          return
        }

        try {
          const response = await fetch('${requestUrl.pathname}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken, refreshToken, type, next })
          })
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.error || '세션 저장에 실패했습니다.')
          }
          window.location.replace(result.redirectUrl || '${origin}/me')
        } catch (error) {
          console.error('[OAuth Callback] Hash processing error', error)
          window.location.replace('${origin}/login?error=' + encodeURIComponent(error?.message || '로그인 처리 중 오류가 발생했습니다.'))
        }
      })()
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  let body: { accessToken?: string; refreshToken?: string; type?: string; next?: string }

  try {
    body = await request.json()
  } catch (error) {
    console.error('[OAuth Callback] POST body parse error:', error)
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const accessToken = body.accessToken
  const refreshToken = body.refreshToken ?? ''

  if (!accessToken) {
    return NextResponse.json({ success: false, error: '세션 토큰이 존재하지 않습니다.' }, { status: 400 })
  }

  const cookieCapture = NextResponse.next()

  try {
    const supabase = createSupabaseWithCookies(cookieCapture)
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    if (error) {
      console.error('[OAuth Callback] setSession error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const { redirectUrl } = await finalizeSession(origin, supabase)
    const finalResponse = NextResponse.json({ success: true, redirectUrl })
    cookieCapture.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie)
    })
    return finalResponse
  } catch (error: any) {
    console.error('[OAuth Callback] Unexpected POST error:', error)
    return NextResponse.json({ success: false, error: '세션 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE() {
  const cookieCapture = NextResponse.next()

  try {
    const supabase = createSupabaseWithCookies(cookieCapture)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[OAuth Callback] signOut error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })
    cookieCapture.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  } catch (error: any) {
    console.error('[OAuth Callback] Unexpected DELETE error:', error)
    return NextResponse.json({ success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
