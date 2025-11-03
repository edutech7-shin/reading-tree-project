import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 기본 클라이언트 반환 (빌드 시 평가 방지)
    throw new Error('getSupabaseClient should only be used on the client side')
  }
  
  if (cachedClient) return cachedClient
  
  // Next.js에서 NEXT_PUBLIC_ 접두사가 있는 환경변수는 빌드 타임에 인라인됨
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anon) {
    console.error('[Supabase Client] Missing environment variables:', {
      url: url ? 'present' : 'missing',
      anon: anon ? 'present' : 'missing'
    })
    throw new Error('Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.')
  }
  
  // URL 유효성 검증
  try {
    new URL(url)
  } catch (error) {
    console.error('[Supabase Client] Invalid URL:', url)
    throw new Error(`유효하지 않은 Supabase URL입니다: ${url}`)
  }
  
  // @supabase/ssr의 createBrowserClient를 사용하여 브라우저 쿠키 자동 처리
  try {
    cachedClient = createBrowserClient(url, anon)
    return cachedClient
  } catch (error) {
    console.error('[Supabase Client] Failed to create client:', error)
    throw new Error(`Supabase 클라이언트 생성 실패: ${error instanceof Error ? error.message : String(error)}`)
  }
}


