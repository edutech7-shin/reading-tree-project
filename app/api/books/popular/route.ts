import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 도서관 정보나루 대출 급상승 도서 API 응답 타입
type HotTrendBook = {
  bookname?: string
  authors?: string
  isbn13?: string
  publisher?: string
  publication_year?: string
  bookImageURL?: string
  bookDtlUrl?: string
  loan_count?: number
  rank?: number
  rank_change?: number
  [key: string]: any
}

type HotTrendResponse = {
  response?: {
    result?: {
      numFound?: number
      docs?: Array<{
        doc?: HotTrendBook
      }>
    }
    results?: {
      result?: {
        date?: string
        docs?: Array<{
          doc?: HotTrendBook
        }>
      }
    }
    error?: {
      message?: string
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // 도서관 정보나루 API 키 확인
    const LIBRARY_API_KEY = process.env.LIBRARY_API_KEY?.trim()
    
    if (!LIBRARY_API_KEY) {
      console.error('[Popular Books] LIBRARY_API_KEY is not set')
      return NextResponse.json({ 
        books: [], 
        error: 'LIBRARY_API_KEY 환경 변수가 설정되지 않았습니다.' 
      })
    }
    
    // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const searchDt = `${year}-${month}-${day}`
    
    // 도서관 정보나루 대출 급상승 도서 API 호출
    // 참고: 실제 API 엔드포인트는 도서관 정보나루 문서를 확인해야 함
    // 일단 일반적인 패턴으로 시도
    const apiUrl = new URL('http://data4library.kr/api/hotTrend')
    apiUrl.searchParams.set('authKey', LIBRARY_API_KEY)
    apiUrl.searchParams.set('searchDt', searchDt)
    apiUrl.searchParams.set('format', 'json')
    
    console.log('[Popular Books] API URL:', apiUrl.toString().replace(LIBRARY_API_KEY, '***'))
    
    let apiResponse: Response
    try {
      apiResponse = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ReadingTree/1.0)'
        }
      })
      
      if (!apiResponse.ok) {
        throw new Error(`API 호출 실패: ${apiResponse.status} ${apiResponse.statusText}`)
      }
      
      const data: HotTrendResponse = await apiResponse.json()
      
      if (data.response?.error) {
        throw new Error(data.response.error.message || 'API 오류')
      }
      
      // 응답 데이터 파싱
      const books: Array<{
        title: string
        author: string
        coverUrl: string | null
        isbn: string | null
        publisher: string | null
        publicationYear: string | null
        totalPages: number | null
      }> = []
      
      // API 응답 구조에 따라 데이터 추출
      // 구조 1: response.result.docs
      // 구조 2: response.results.result.docs
      const docs = data.response?.result?.docs || 
                   data.response?.results?.result?.docs || 
                   []
      
      for (const item of docs.slice(0, 5)) {
        // item이 { doc?: HotTrendBook } 형태일 수도 있고, 직접 HotTrendBook일 수도 있음
        const rawDoc = 'doc' in item ? item.doc : item
        if (!rawDoc) continue
        
        // 타입 단언: rawDoc이 HotTrendBook 타입임을 명시
        const doc = rawDoc as HotTrendBook
        
        const book = {
          title: doc.bookname || '',
          author: doc.authors || '',
          coverUrl: doc.bookImageURL || null,
          isbn: doc.isbn13 || null,
          publisher: doc.publisher || null,
          publicationYear: doc.publication_year || null,
          totalPages: null
        }
        
        // 제목이 있는 경우만 추가
        if (book.title) {
          books.push(book)
          
          // 캐시에 저장 (나중에 검색 시 사용)
          if (book.isbn) {
            await supabase
              .from('book_cache')
              .upsert({
                isbn: book.isbn,
                title: book.title,
                author: book.author,
                cover_url: book.coverUrl,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'isbn'
              })
          }
        }
      }
      
      return NextResponse.json({ books })
      
    } catch (fetchError: any) {
      console.error('[Popular Books] API 호출 오류:', fetchError)
      
      // API 호출 실패 시 데이터베이스의 기존 데이터 반환 (fallback)
      const { data: cachedBooks } = await supabase
        .from('popular_children_books')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(5)
      
      if (cachedBooks && cachedBooks.length > 0) {
        return NextResponse.json({
          books: cachedBooks.map((book: any) => ({
            title: book.book_title || '',
            author: book.book_author || '',
            coverUrl: book.book_cover_url || null,
            isbn: book.book_isbn || null,
            publisher: book.book_publisher || null,
            publicationYear: book.book_publication_year || null,
            totalPages: book.book_total_pages || null
          })),
          fromCache: true
        })
      }
      
      return NextResponse.json({ 
        books: [], 
        error: fetchError.message || '대출 급상승 도서를 가져올 수 없습니다.' 
      })
    }
    
  } catch (error: any) {
    console.error('[Popular Books] 오류:', error)
    return NextResponse.json({ 
      books: [], 
      error: error.message || '서버 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
