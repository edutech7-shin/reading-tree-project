import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 도서관 정보나루 API 응답 타입 (srchBooks)
// 메뉴얼 기준: response.docs[].doc[] 구조에서 각 doc는 직접 book 정보를 포함
type BookDoc = {
  bookname?: string
  authors?: string
  isbn13?: string
  publisher?: string
  publication_year?: string
  bookImageURL?: string
  bookDtlUrl?: string
  loan_count?: number
  // 기타 필드들
  [key: string]: any
}

type LibraryResponse = {
  response?: {
    request?: {
      keyword?: string
      pageNo?: number
      pageSize?: number
    }
    numFound?: number  // 전체 검색결과 건수 (메뉴얼 기준)
    resultNum?: number  // fallback
    docs?: Array<{
      doc?: BookDoc  // 각 doc는 단일 객체 (배열이 아님!)
    }>
    libs?: {
      lib?: Array<{
        book?: BookDoc  // srchDtlList 형식
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
    const LIBRARY_API_KEY = process.env.LIBRARY_API_KEY?.trim() // 공백과 줄바꿈 제거
    console.log('[Book Search] Environment check:', {
      LIBRARY_API_KEY: LIBRARY_API_KEY ? `${LIBRARY_API_KEY.substring(0, 10)}...` : 'NOT SET',
      LIBRARY_API_KEY_LENGTH: LIBRARY_API_KEY?.length || 0,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('LIBRARY') || k.includes('ALADIN'))
    })
    
    if (!LIBRARY_API_KEY) {
      console.error('[Book Search] LIBRARY_API_KEY is not set. Available env keys:', Object.keys(process.env).sort().join(', '))
      return NextResponse.json({ 
        books: [], 
        error: 'LIBRARY_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 환경 변수를 확인하고 재배포하세요.' 
      })
    }
    
    // API 키 형식 검증 (64자리 hex 문자열)
    // 공백이나 줄바꿈 제거 후 검증
    const cleanApiKey = LIBRARY_API_KEY.replace(/\s+/g, '')
    if (cleanApiKey.length !== 64) {
      console.warn('[Book Search] LIBRARY_API_KEY length is unusual:', cleanApiKey.length, '(expected 64)')
    }
    
    // 정리된 API 키 사용
    const finalApiKey = cleanApiKey

    // 도서관 정보나루 API 호출 - 일반 도서 검색 API 사용
    // srchBooks API가 더 간단하고 안정적입니다
    const apiUrl = new URL('http://data4library.kr/api/srchBooks')
    apiUrl.searchParams.set('authKey', finalApiKey) // 정리된 API 키 사용
    apiUrl.searchParams.set('keyword', query) // srchBooks는 keyword 파라미터 사용
    apiUrl.searchParams.set('pageNo', '1')
    apiUrl.searchParams.set('pageSize', '10')
    apiUrl.searchParams.set('format', 'json') // JSON 형식 요청

    const finalUrl = apiUrl.toString()
    console.log('[Book Search] Library API URL:', finalUrl)
    console.log('[Book Search] Request params:', {
      authKey: finalApiKey ? `${finalApiKey.substring(0, 10)}...` : 'MISSING',
      authKeyLength: finalApiKey.length,
      keyword: query,
      pageNo: '1',
      pageSize: '10',
      format: 'json'
    })
    
    // API 호출 시작 시간 기록
    const startTime = Date.now()
    
    let libraryResponse: Response
    try {
      // Accept 헤더 제거 - API가 자체적으로 format 파라미터로 처리
      libraryResponse = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ReadingTree/1.0)'
        }
      })
      
      const duration = Date.now() - startTime
      console.log('[Book Search] API call completed:', {
        status: libraryResponse.status,
        statusText: libraryResponse.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(libraryResponse.headers.entries())
      })
    } catch (fetchError: any) {
      const duration = Date.now() - startTime
      console.error('[Book Search] Fetch error:', {
        message: fetchError.message,
        stack: fetchError.stack,
        duration: `${duration}ms`,
        url: finalUrl
      })
      throw new Error(`API 호출 실패: ${fetchError.message}`)
    }

    if (!libraryResponse.ok) {
      const errorText = await libraryResponse.text().catch(() => '')
      console.error('[Book Search] Library API HTTP error:', {
        status: libraryResponse.status,
        statusText: libraryResponse.statusText,
        body: errorText.substring(0, 1000),
        url: finalUrl
      })
      
      // 406 에러는 Accept 헤더 문제일 수 있음
      if (libraryResponse.status === 406) {
        return NextResponse.json({ 
          books: [],
          error: 'API 요청 형식 오류입니다. Accept 헤더를 확인해주세요.'
        })
      }
      
      // 400 에러는 파라미터 문제일 수 있음
      if (libraryResponse.status === 400) {
        return NextResponse.json({ 
          books: [],
          error: `API 파라미터 오류: ${errorText.substring(0, 200)}`
        })
      }
      
      return NextResponse.json({ 
        books: [],
        error: `도서관 정보나루 API 호출 실패 (${libraryResponse.status}): ${errorText.substring(0, 200)}`
      })
    }

    // JSON 응답 파싱
    let libraryData: LibraryResponse
    try {
      const responseText = await libraryResponse.text()
      console.log('[Book Search] Library API raw response (first 2000 chars):', responseText.substring(0, 2000))
      
      // 빈 응답 체크
      if (!responseText.trim()) {
        console.error('[Book Search] Empty response from API')
        return NextResponse.json({ 
          books: [],
          error: 'API가 빈 응답을 반환했습니다. API 사용 승인 상태를 확인해주세요.'
        })
      }
      
      libraryData = JSON.parse(responseText)
      console.log('[Book Search] Library API parsed response:', JSON.stringify(libraryData).substring(0, 2000))
    } catch (parseError: any) {
      console.error('[Book Search] JSON parse error:', parseError)
      return NextResponse.json({ 
        books: [],
        error: `API 응답 파싱 오류: ${parseError.message}. API 사용 승인 상태를 확인해주세요.`
      })
    }

    // 응답 구조 확인
    if (!libraryData.response) {
      console.error('[Book Search] Invalid response structure:', libraryData)
      return NextResponse.json({ 
        books: [],
        error: 'API 응답 형식이 올바르지 않습니다. API 사용 승인 상태를 확인해주세요.'
      })
    }

    // 에러 응답 처리
    if (libraryData.response.error) {
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

    // 결과 추출 - 메뉴얼 기준 응답 구조 처리
    const numFound = libraryData.response?.numFound || libraryData.response?.resultNum || 0
    console.log('[Book Search] Response structure:', {
      hasResponse: !!libraryData.response,
      numFound,
      hasDocs: !!libraryData.response?.docs,
      hasLibs: !!libraryData.response?.libs,
      responseKeys: libraryData.response ? Object.keys(libraryData.response) : []
    })
    
    let books: Array<{ title: string; author: string; coverUrl: string | null; isbn: string }> = []
    
    // 방법 1: docs 배열 (srchBooks 표준 형식 - 실제 API 응답 구조)
    // 구조: response.docs[] - 각 요소는 { doc: BookDoc } 형태
    // doc는 단일 객체이지 배열이 아님!
    const docs = libraryData.response?.docs
    if (docs && Array.isArray(docs) && docs.length > 0) {
      console.log('[Book Search] Processing docs array, length:', docs.length)
      for (const docWrapper of docs) {
        const bookDoc = docWrapper.doc
        if (!bookDoc || !bookDoc.bookname) {
          console.log('[Book Search] Skipping doc without bookname:', bookDoc)
          continue
        }
        
        const isbn = bookDoc.isbn13 || ''
        if (!isbn) {
          console.log('[Book Search] Skipping doc without ISBN:', bookDoc.bookname)
          continue
        }
        
        books.push({
          title: bookDoc.bookname || '',
          author: bookDoc.authors || '',
          coverUrl: bookDoc.bookImageURL || null,
          isbn: isbn
        })
      }
    }
    
    // 방법 2: libs 구조 (srchDtlList 형식 - fallback)
    if (books.length === 0) {
      const libs = libraryData.response?.libs?.lib
      if (libs && Array.isArray(libs) && libs.length > 0) {
        console.log('[Book Search] Processing libs array, length:', libs.length)
        for (const lib of libs) {
          const book = lib.book
          if (!book || !book.bookname) continue
          
          const isbn = book.isbn13 || ''
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
    
    // 방법 3: 응답 구조가 예상과 다를 경우 재귀 탐색
    if (books.length === 0 && libraryData.response && numFound > 0) {
      console.log('[Book Search] Trying to find books in alternative structure')
      // 응답 전체를 탐색하여 bookname을 가진 객체 찾기
      const findBooks = (obj: any, depth = 0): any[] => {
        if (depth > 5) return [] // 깊이 제한
        if (!obj || typeof obj !== 'object') return []
        
        const found: any[] = []
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (item && typeof item === 'object' && item.bookname && item.isbn13) {
              found.push(item)
            } else {
              found.push(...findBooks(item, depth + 1))
            }
          }
        } else {
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              found.push(...findBooks(obj[key], depth + 1))
            }
          }
        }
        return found
      }
      
      const foundBooks = findBooks(libraryData.response)
      console.log('[Book Search] Found books via recursive search:', foundBooks.length)
      
      for (const bookDoc of foundBooks) {
        if (!bookDoc.bookname) continue
        const isbn = bookDoc.isbn13 || ''
        if (!isbn) continue
        
        books.push({
          title: bookDoc.bookname || '',
          author: bookDoc.authors || '',
          coverUrl: bookDoc.bookImageURL || null,
          isbn: isbn
        })
      }
    }
    
    // 결과가 없을 때 처리
    if (books.length === 0) {
      if (numFound === 0) {
        console.warn('[Book Search] No results found. numFound:', numFound)
        return NextResponse.json({ 
          books: [],
          error: '검색 결과가 없습니다. 다른 검색어를 시도해보세요.'
        })
      }
      // numFound가 있지만 파싱 실패한 경우
      console.warn('[Book Search] Found results (numFound:', numFound, ') but failed to parse. Response structure may be different.')
      return NextResponse.json({ 
        books: [],
        error: `검색 결과는 있지만 파싱에 실패했습니다. (전체 결과: ${numFound}건)`
      })
    }
    
    console.log('[Book Search] Successfully parsed', books.length, 'books from', numFound, 'total results')

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
    console.error('[Book Search] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // 네트워크 에러인지 확인
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return NextResponse.json({ 
        error: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        books: []
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: error.message || '검색 중 오류가 발생했습니다.',
      books: []
    }, { status: 500 })
  }
}
