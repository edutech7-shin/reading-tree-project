import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

// 알라딘 API 응답 타입
type AladinBookItem = {
  title: string
  author: string
  isbn: string
  isbn13: string
  cover: string
  description: string
  publisher?: string
  pubDate?: string
}

type AladinResponse = {
  version?: string
  totalResults?: number
  item?: AladinBookItem[]
  error?: string
  errorMessage?: string
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

    // 알라딘 API 키 확인
    const ALADIN_API_KEY = process.env.ALADIN_API_KEY
    if (!ALADIN_API_KEY) {
      console.warn('[Book Search] ALADIN_API_KEY is not set. Returning empty results.')
      return NextResponse.json({ 
        books: [], 
        error: 'ALADIN_API_KEY 환경 변수가 설정되지 않았습니다.' 
      })
    }

    // 알라딘 API 호출
    const apiUrl = new URL('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx')
    apiUrl.searchParams.set('TTBKey', ALADIN_API_KEY)
    apiUrl.searchParams.set('Query', query)
    apiUrl.searchParams.set('QueryType', 'Title')
    apiUrl.searchParams.set('MaxResults', '10')
    apiUrl.searchParams.set('Start', '1')
    apiUrl.searchParams.set('SearchTarget', 'Book')
    apiUrl.searchParams.set('Output', 'JS')
    apiUrl.searchParams.set('Version', '20131101')

    console.log('[Book Search] Aladin API URL:', apiUrl.toString())
    
    const aladinResponse = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!aladinResponse.ok) {
      console.error('[Book Search] Aladin API HTTP error:', aladinResponse.status, aladinResponse.statusText)
      throw new Error(`알라딘 API 호출 실패: ${aladinResponse.status}`)
    }

    // 알라딘 API는 때때로 JSONP 형식으로 반환할 수 있으므로, 텍스트로 먼저 받아서 처리
    const responseText = await aladinResponse.text()
    console.log('[Book Search] Aladin API response (first 500 chars):', responseText.substring(0, 500))
    
    let aladinData: AladinResponse
    try {
      // JSON 파싱 시도
      aladinData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[Book Search] Failed to parse JSON response:', parseError)
      // JSONP 형식인 경우 처리 (예: callback({...}))
      if (responseText.includes('(') && responseText.includes(')')) {
        const jsonMatch = responseText.match(/\{.*\}/s)
        if (jsonMatch) {
          aladinData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('알라딘 API 응답 형식이 올바르지 않습니다.')
        }
      } else {
        throw new Error('알라딘 API 응답을 파싱할 수 없습니다.')
      }
    }

    // 에러 응답 처리
    if (aladinData.error || aladinData.errorMessage) {
      console.error('[Book Search] Aladin API error:', aladinData.errorMessage || aladinData.error)
      return NextResponse.json({ 
        books: [],
        error: aladinData.errorMessage || '검색 중 오류가 발생했습니다.'
      })
    }

    // 결과가 없으면 빈 배열 반환
    if (!aladinData.item || aladinData.item.length === 0) {
      return NextResponse.json({ books: [] })
    }

    // 결과를 캐시에 저장하고 반환 형식으로 변환
    const books = aladinData.item.map((item) => {
      // ISBN은 isbn13 우선, 없으면 isbn 사용
      const isbn = item.isbn13 || item.isbn || ''
      
      return {
        title: item.title || '',
        author: item.author || '',
        coverUrl: item.cover || null,
        isbn: isbn
      }
    })

    // 캐시에 저장 (upsert)
    try {
      // 각 책 정보를 캐시에 저장
      const cacheInserts = aladinData.item.map((item) => {
        const isbn = item.isbn13 || item.isbn || ''
        if (!isbn) return null // ISBN이 없으면 캐시 불가
        
        return {
          isbn: isbn,
          title: item.title || '',
          author: item.author || '',
          cover_url: item.cover || null,
          description: item.description || null,
          updated_at: new Date().toISOString()
        }
      }).filter((item): item is NonNullable<typeof item> => item !== null)

      if (cacheInserts.length > 0) {
        // upsert로 중복 방지
        const { error: cacheError } = await supabase
          .from('book_cache')
          .upsert(cacheInserts, { 
            onConflict: 'isbn',
            ignoreDuplicates: false 
          })

        if (cacheError) {
          console.warn('[Book Search] Cache save warning:', cacheError.message)
          // 캐시 저장 실패해도 결과는 반환
        }
      }
    } catch (cacheError) {
      // 캐시 저장 실패해도 결과는 반환
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

