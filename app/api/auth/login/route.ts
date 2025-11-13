import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getEnv(key: string) {
  const raw = process.env[key]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new Error(`[login api] Missing environment variable: ${key}`)
  }
  return value
}

function createSupabaseWithResponse(response: NextResponse) {
  const cookieStore = cookies()
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...options })
      }
    }
  })
}

function createAdminClient(): SupabaseClient {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

type LoginBody = {
  email?: string
  password?: string
}

export async function POST(request: NextRequest) {
  let payload: LoginBody

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const email = payload.email?.trim() ?? ''
  const password = payload.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  const cookieResponse = NextResponse.next()

  try {
    const supabase = createSupabaseWithResponse(cookieResponse)
    const { data: sessionData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const message = error.message?.toLowerCase() ?? ''
      if (message.includes('invalid login credentials')) {
        return NextResponse.json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
      }
      if (message.includes('email not confirmed')) {
        return NextResponse.json({ success: false, error: '이메일 인증이 완료되지 않았습니다. 인증 메일을 확인해주세요.' }, { status: 403 })
      }
      return NextResponse.json({ success: false, error: error.message || '로그인에 실패했습니다.' }, { status: 401 })
    }

    const user = sessionData.user
    if (!user) {
      return NextResponse.json({ success: false, error: '사용자 정보를 확인하지 못했습니다.' }, { status: 500 })
    }

    const finalResponse = NextResponse.json({ success: true, redirectUrl: '/me' })
    cookieResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie)
    })
    return finalResponse
  } catch (error: any) {
    console.error('[login api] unexpected error:', error)
    return NextResponse.json({ success: false, error: '로그인 도중 오류가 발생했습니다.' }, { status: 500 })
  }
}
