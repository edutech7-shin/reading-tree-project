import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getEnv(key: string) {
  const raw = process.env[key]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new Error(`[logout api] Missing environment variable: ${key}`)
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

export async function POST() {
  const response = NextResponse.json({ success: true })

  try {
    const supabase = createSupabaseWithResponse(response)
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return response
  } catch (error: any) {
    console.error('[logout api] unexpected error:', error)
    return NextResponse.json({ success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE() {
  return POST()
}
