import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.error('[Supabase Client] Missing environment variables:', {
      url: url ? 'present' : 'MISSING',
      anon: anon ? 'present' : 'MISSING'
    })
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }

  console.log('[Supabase Client] Creating client with URL:', url)
  // 런타임에 생성하여 빌드 시 평가 에러를 회피
  cachedClient = createClient(url, anon)
  return cachedClient
}


