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
      const errorText = await libraryResponse.text().catch(() => '')
      console.error('[Book Search] Library API HTTP error:', {
        status: libraryResponse.status,
        statusText: libraryResponse.statusText,
        body: errorText.substring(0, 500)
      })
      
      // 406 에러는 Accept 헤더 문제일 수 있음
      if (libraryResponse.status === 406) {
        return NextResponse.json({ 
          books: [],
          error: 'API 요청 형식 오류입니다. Accept 헤더를 확인해주세요.'
        })
      }
      
      throw new Error(`도서관 정보나루 API 호출 실패: ${libraryResponse.status}`)
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

    // 결과 추출 - 다양한 응답 형식 지원
    const resultNum = libraryData.response?.resultNum || 0
    console.log('[Book Search] Response structure:', {
      hasResponse: !!libraryData.response,
      resultNum,
      hasDocs: !!libraryData.response?.docs,
      hasLibs: !!libraryData.response?.libs,
      responseKeys: libraryData.response ? Object.keys(libraryData.response) : []
    })
    
    let books: Array<{ title: string; author: string; coverUrl: string | null; isbn: string }> = []
    
    // 방법 1: docs 배열 (srchBooks 일반 형식)
    const docs = libraryData.response?.docs
    if (docs && Array.isArray(docs) && docs.length > 0) {
      console.log('[Book Search] Processing docs array, length:', docs.length)
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
    }
    
    // 방법 2: libs 구조 (srchDtlList 형식)
    if (books.length === 0) {
      const libs = libraryData.response?.libs?.lib
      if (libs && Array.isArray(libs) && libs.length > 0) {
        console.log('[Book Search] Processing libs array, length:', libs.length)
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
    
    // 방법 3: 직접 book 배열 체크 (다른 형식일 수 있음)
    if (books.length === 0 && libraryData.response) {
      console.log('[Book Search] Trying to find books in alternative structure')
      // 응답 전체를 탐색하여 book 객체 찾기
      const findBooks = (obj: any, depth = 0): any[] => {
        if (depth > 5) return [] // 깊이 제한
        if (!obj || typeof obj !== 'object') return []
        
        const found: any[] = []
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (item && typeof item === 'object' && item.bookname) {
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
      
      for (const book of foundBooks) {
        if (!book.bookname) continue
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
