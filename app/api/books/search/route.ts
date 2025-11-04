import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 도서관 정보나루 API 응답 타입 (srchBooks)
type LibraryResponse = {
  response?: {
    resultNum?: number
    docs?: Array<{
      doc?: Array<{
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
    }>
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
    console.log('[Book Search] Environment check:', {
      LIBRARY_API_KEY: LIBRARY_API_KEY ? `${LIBRARY_API_KEY.substring(0, 10)}...` : 'NOT SET',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('LIBRARY') || k.includes('ALADIN'))
    })
    
    if (!LIBRARY_API_KEY) {
      console.error('[Book Search] LIBRARY_API_KEY is not set. Available env keys:', Object.keys(process.env).sort().join(', '))
      return NextResponse.json({ 
        books: [], 
        error: 'LIBRARY_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 환경 변수를 확인하고 재배포하세요.' 
      })
    }

    // 도서관 정보나루 API 호출 - 일반 도서 검색 API 사용
    // srchBooks API가 더 간단하고 안정적입니다
    const apiUrl = new URL('http://data4library.kr/api/srchBooks')
    apiUrl.searchParams.set('authKey', LIBRARY_API_KEY)
    apiUrl.searchParams.set('keyword', query) // srchBooks는 keyword 파라미터 사용
    apiUrl.searchParams.set('pageNo', '1')
    apiUrl.searchParams.set('pageSize', '10')
    apiUrl.searchParams.set('format', 'json') // JSON 형식 요청

    console.log('[Book Search] Library API URL:', apiUrl.toString())
    
    // Accept 헤더 제거 - API가 자체적으로 format 파라미터로 처리
    const libraryResponse = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReadingTree/1.0)'
      }
    })

    if (!libraryResponse.ok) {
      console.error('[Book Search] Library API HTTP error:', libraryResponse.status, libraryResponse.statusText)
      throw new Error(`도서관 정보나루 API 호출 실패: ${libraryResponse.status}`)
    }

    // JSON 응답 파싱
    const libraryData: LibraryResponse = await libraryResponse.json()
    console.log('[Book Search] Library API response:', JSON.stringify(libraryData).substring(0, 1000))

    // 에러 응답 처리
    if (libraryData.response?.error) {
      const errorMessage = libraryData.response.error.message || '검색 중 오류가 발생했습니다.'
      console.error('[Book Search] Library API error:', errorMessage)
      
      // 승인 대기 상태 확인
      if (errorMessage.includes('승인') || errorMessage.includes('인증') || errorMessage.includes('사용')) {
        return NextResponse.json({ 
          books: [],
          error: '도서관 정보나루 API 사용 승인이 완료되지 않았습니다. 마이페이지에서 승인 상태를 확인해주세요.'
        })
      }
      
      return NextResponse.json({ 
        books: [],
        error: errorMessage
      })
    }

    // 결과 추출 - srchBooks API 응답 형식 처리
    const resultNum = libraryData.response?.resultNum || 0
    
    // srchBooks는 docs 배열을 사용합니다
    const docs = libraryData.response?.docs
    let books: Array<{ title: string; author: string; coverUrl: string | null; isbn: string }> = []
    
    if (docs && Array.isArray(docs) && docs.length > 0) {
      // docs 배열에서 도서 정보 추출
      for (const doc of docs) {
        if (doc.doc && Array.isArray(doc.doc)) {
          for (const item of doc.doc) {
            const book = item.book
            if (!book || !book.bookname) continue
            
            const isbn = book.isbn13 || book.isbn || ''
            if (!isbn) continue
            
            books.push({
              title: book.bookname || '',
              author: book.authors || '',
              coverUrl: book.bookImageURL || null,
              isbn: isbn
            })
          }
        }
      }
    } else {
      // fallback: libs 구조도 지원 (srchDtlList 형식)
      const libs = libraryData.response?.libs?.lib
      if (libs && Array.isArray(libs) && libs.length > 0) {
        for (const lib of libs) {
          const book = lib.book
          if (!book || !book.bookname) continue
          
          const isbn = book.isbn13 || book.isbn || ''
          if (!isbn) continue
          
          books.push({
            title: book.bookname || '',
            author: book.authors || '',
            coverUrl: book.bookImageURL || null,
            isbn: isbn
          })
        }
      }
    }
    
    // 결과가 없을 때 처리
    if (books.length === 0) {
      if (resultNum === 0) {
        console.warn('[Book Search] No results found. API approval may be pending.')
        return NextResponse.json({ 
          books: [],
          error: '검색 결과가 없습니다. API 사용 승인이 완료되었는지 확인해주세요.'
        })
      }
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
