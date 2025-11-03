import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 도서관 정보나루 API 응답 타입
type LibraryResponse = {
  response?: {
    resultNum?: number
    libs?: {
      lib?: Array<{
        book?: {
          bookname?: string
          authors?: string
          isbn?: string
          isbn13?: string
          bookImageURL?: string
          description?: string
          publisher?: string
          pubYear?: string
        }
      }>
    }
    error?: {
      message?: string
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ books: [] })
  }

  try {
    const supabase = createSupabaseServerClient()
    
    // 먼저 캐시된 데이터 확인
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

    // 도서관 정보나루 API 키 확인
    const LIBRARY_API_KEY = process.env.LIBRARY_API_KEY
    if (!LIBRARY_API_KEY) {
      console.warn('[Book Search] LIBRARY_API_KEY is not set. Returning empty results.')
      return NextResponse.json({ 
        books: [], 
        error: 'LIBRARY_API_KEY 환경 변수가 설정되지 않았습니다. 도서관 정보나루(data4library.kr)에서 인증키를 발급받아주세요.' 
      })
    }

    // 도서관 정보나루 API 호출 - 서지정보 상세검색 API 사용
    // 책 제목으로 검색
    const apiUrl = new URL('http://data4library.kr/api/srchDtlList')
    apiUrl.searchParams.set('authKey', LIBRARY_API_KEY)
    apiUrl.searchParams.set('title', query)
    apiUrl.searchParams.set('pageNo', '1')
    apiUrl.searchParams.set('pageSize', '10')
    apiUrl.searchParams.set('format', 'json') // JSON 형식 요청

    console.log('[Book Search] Library API URL:', apiUrl.toString())
    
    const libraryResponse = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!libraryResponse.ok) {
      console.error('[Book Search] Library API HTTP error:', libraryResponse.status, libraryResponse.statusText)
      throw new Error(`도서관 정보나루 API 호출 실패: ${libraryResponse.status}`)
    }

    // JSON 응답 파싱
    const libraryData: LibraryResponse = await libraryResponse.json()
    console.log('[Book Search] Library API response:', JSON.stringify(libraryData).substring(0, 500))

    // 에러 응답 처리
    if (libraryData.response?.error) {
      console.error('[Book Search] Library API error:', libraryData.response.error.message)
      return NextResponse.json({ 
        books: [],
        error: libraryData.response.error.message || '검색 중 오류가 발생했습니다.'
      })
    }

    // 결과 추출
    const libs = libraryData.response?.libs?.lib
    if (!libs || !Array.isArray(libs) || libs.length === 0) {
      return NextResponse.json({ books: [] })
    }

    // 결과를 캐시에 저장하고 반환 형식으로 변환
    const books: Array<{ title: string; author: string; coverUrl: string | null; isbn: string }> = []
    
    for (const lib of libs) {
      const book = lib.book
      if (!book || !book.bookname) continue
      
      const isbn = book.isbn13 || book.isbn || ''
      if (!isbn) continue // ISBN이 없으면 건너뛰기
      
      books.push({
        title: book.bookname || '',
        author: book.authors || '',
        coverUrl: book.bookImageURL || null,
        isbn: isbn
      })
    }

    if (books.length === 0) {
      return NextResponse.json({ books: [] })
    }

    // 캐시에 저장 (upsert)
    try {
      const cacheInserts = books.map((book) => ({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        cover_url: book.coverUrl,
        description: null, // 도서관 정보나루 API에서 상세 설명은 별도 API 필요
        updated_at: new Date().toISOString()
      }))

      if (cacheInserts.length > 0) {
        const { error: cacheError } = await supabase
          .from('book_cache')
          .upsert(cacheInserts, { 
            onConflict: 'isbn',
            ignoreDuplicates: false 
          })

        if (cacheError) {
          console.warn('[Book Search] Cache save warning:', cacheError.message)
        }
      }
    } catch (cacheError) {
      console.warn('[Book Search] Cache save failed:', cacheError)
    }

    return NextResponse.json({ books })
  } catch (error: any) {
    console.error('[Book Search] Error:', error)
    return NextResponse.json({ 
      error: error.message || '검색 중 오류가 발생했습니다.',
      books: []
    }, { status: 500 })
  }
}
