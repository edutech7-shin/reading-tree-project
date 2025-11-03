import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 기본 클라이언트 반환 (빌드 시 평가 방지)
    throw new Error('getSupabaseClient should only be used on the client side')
  }
  
  if (cachedClient) return cachedClient
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anon) {
    throw new Error('Missing Supabase environment variables')
  }
  
  // @supabase/ssr의 createBrowserClient를 사용하여 브라우저 쿠키 자동 처리
  cachedClient = createBrowserClient(url, anon)
  return cachedClient
}


