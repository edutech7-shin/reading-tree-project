import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 책 검색 API 엔드포인트
// TODO: 실제 알라딘 API 또는 도서관 정보나루 API 연동
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ books: [] })
  }

  try {
    // 먼저 캐시된 데이터 확인
    const supabase = createSupabaseServerClient()
    const { data: cached } = await supabase
      .from('book_cache')
      .select('isbn, title, author, cover_url')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
      .limit(10)

    if (cached && cached.length > 0) {
      return NextResponse.json({
        books: cached.map(item => ({
          title: item.title || '',
          author: item.author || '',
          coverUrl: item.cover_url || null,
          isbn: item.isbn
        }))
      })
    }

    // 실제 API 연동이 없으면 빈 결과 반환
    // TODO: 알라딘 API 키가 있으면 여기서 연동
    // const ALADIN_API_KEY = process.env.ALADIN_API_KEY
    // if (ALADIN_API_KEY) {
    //   const response = await fetch(`https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_API_KEY}&Query=${encodeURIComponent(query)}&QueryType=Title&Output=JS&Version=20131101`)
    //   const data = await response.json()
    //   // 결과 처리 및 캐시 저장
    // }

    return NextResponse.json({ books: [] })
  } catch (error: any) {
    console.error('[Book Search] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

