import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    const supabase = createServerClient(
      url as string,
      anon as string,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Exchange code for session
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes - 내 나무 페이지로 이동
  return NextResponse.redirect(`${origin}/me`)
}
