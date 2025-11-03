import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { XMLParser } from 'fast-xml-parser'

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
    // 서버 사이드 호출은 Output=XML을 사용해야 함 (JS는 브라우저에서만 가능)
    const apiUrl = new URL('http://www.aladin.co.kr/ttb/api/ItemSearch.aspx')
    apiUrl.searchParams.set('TTBKey', ALADIN_API_KEY)
    apiUrl.searchParams.set('Query', query)
    apiUrl.searchParams.set('QueryType', 'Title')
    apiUrl.searchParams.set('MaxResults', '10')
    apiUrl.searchParams.set('Start', '1')
    apiUrl.searchParams.set('SearchTarget', 'Book')
    apiUrl.searchParams.set('Output', 'XML') // 서버 사이드에서는 XML 사용
    apiUrl.searchParams.set('Version', '20131101')

    console.log('[Book Search] Aladin API URL:', apiUrl.toString())
    
    // 알라딘 API에 등록된 URL (http://만 지원, https는 자동으로 http로 등록됨)
    // 실제 요청은 https://로 올 수 있지만, 알라딘에는 등록된 http://를 전송해야 함
    const registeredDomain = 'http://reading-tree-project.vercel.app'
    
    // 요청 출처 확인 (디버깅용)
    const requestOrigin = request.headers.get('origin') || request.headers.get('referer') || ''
    const requestUrl = new URL(request.url)
    
    // 요청이 https://로 와도, 알라딘에는 등록된 http://를 사용
    // 실제 요청 URL과 등록된 도메인이 일치하는지 확인 (프로토콜 무시)
    const requestHost = requestUrl.hostname || ''
    const registeredHost = new URL(registeredDomain).hostname
    const isCorrectDomain = requestHost === registeredHost || requestHost.includes('reading-tree-project.vercel.app')
    
    console.log('[Book Search] Request origin:', requestOrigin)
    console.log('[Book Search] Request URL:', requestUrl.toString())
    console.log('[Book Search] Request hostname:', requestHost)
    console.log('[Book Search] Registered hostname:', registeredHost)
    console.log('[Book Search] Domain match:', isCorrectDomain)
    console.log('[Book Search] Using Referer (registered):', registeredDomain)
    
    // 알라딘 API 호출 시에는 항상 등록된 http:// URL을 Referer로 사용
    // 서버 사이드 호출이므로 실제 요청 출처를 알라딘에 전달하기 위해 추가 헤더 사용
    // 알라딘 API는 요청이 등록된 도메인에서 왔는지 확인하기 위해 Referer를 체크
    const aladinResponse = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'Referer': registeredDomain,
        'Origin': registeredDomain,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // redirect: 'follow' - 기본값
      // credentials: 'omit' - 기본값
    })

    if (!aladinResponse.ok) {
      console.error('[Book Search] Aladin API HTTP error:', aladinResponse.status, aladinResponse.statusText)
      throw new Error(`알라딘 API 호출 실패: ${aladinResponse.status}`)
    }

    // XML 응답을 텍스트로 받아서 파싱
    const responseText = await aladinResponse.text()
    console.log('[Book Search] Aladin API response (first 500 chars):', responseText.substring(0, 500))
    
    // 에러 메시지 확인 (XML 파싱 전에)
    if (responseText.includes('API출력이 금지된 회원입니다')) {
      const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1')
      if (isLocalhost) {
        throw new Error('알라딘 API는 로컬 개발 환경에서 사용할 수 없습니다. Vercel 배포 환경(reading-tree-project.vercel.app)에서만 작동합니다.')
      }
      
      // 도메인은 맞지만 여전히 오류가 발생하는 경우
      if (!isCorrectDomain) {
        throw new Error(`알라딘 API 사용 권한이 없습니다. 요청 도메인(${requestHost})이 등록된 도메인(reading-tree-project.vercel.app)과 일치하지 않습니다.`)
      }
      
      // 서버 사이드 호출 시 Referer가 제대로 전달되지 않을 수 있음
      // 알라딘 API는 브라우저에서 직접 호출할 때만 Referer를 확인할 수 있음
      console.error('[Book Search] Aladin API domain restriction error')
      console.error('[Book Search] Registered domain:', registeredDomain)
      console.error('[Book Search] Request hostname:', requestHost)
      console.error('[Book Search] Request origin:', requestOrigin)
      
      throw new Error(`알라딘 API 사용 권한 오류. 서버 사이드 호출 시 Referer 헤더 제한으로 인해 작동하지 않을 수 있습니다. 
알라딘 고객센터에 서버 사이드 호출 방법을 문의하시거나, 브라우저에서 직접 호출하는 방식을 고려해보세요.
등록된 URL: ${registeredDomain}`)
    }
    
    // XML 파싱
    let aladinData: any
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      })
      const result = parser.parse(responseText)
      
      // 알라딘 XML 응답 구조: <object><item>...</item></object>
      const objectData = result.object || result
      
      // 에러 체크
      if (objectData.error) {
        throw new Error(objectData.error || '알라딘 API 에러')
      }
      
      // item 배열 추출 (단일 객체일 수도 있고 배열일 수도 있음)
      const items = Array.isArray(objectData.item) 
        ? objectData.item 
        : objectData.item 
          ? [objectData.item] 
          : []
      
      const itemArray: AladinBookItem[] = items.map((item: any) => ({
        title: item.title || '',
        author: item.author || '',
        isbn: item.isbn || '',
        isbn13: item.isbn13 || item.isbn || '',
        cover: item.cover || '',
        description: item.description || ''
      }))
      
      aladinData = {
        item: itemArray,
        totalResults: itemArray.length
      }
    } catch (parseError: any) {
      console.error('[Book Search] Failed to parse XML response:', parseError)
      throw new Error(parseError.message || '알라딘 API 응답을 파싱할 수 없습니다.')
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
    const books = aladinData.item.map((item: AladinBookItem) => {
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
      const cacheInserts = aladinData.item.map((item: AladinBookItem) => {
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
      }).filter((item: any): item is NonNullable<typeof item> => item !== null)

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

