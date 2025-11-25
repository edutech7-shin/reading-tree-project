import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type CreateMissionBody = {
  title: string
  description?: string
  type: 'book_reading' | 'general'
  verification_method: 'self' | 'teacher'
  book_id?: number
  book_title?: string
  book_author?: string
  book_isbn?: string
  mission_content?: string
  points: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ success: false, error: '교사만 미션을 생성할 수 있습니다.' }, { status: 403 })
    }

    let body: CreateMissionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { title, description, type, verification_method, book_id, book_title, book_author, book_isbn, mission_content, points } = body

    if (!title || !type || !verification_method || !points) {
      return NextResponse.json({ success: false, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    if (points <= 0) {
      return NextResponse.json({ success: false, error: '포인트는 0보다 커야 합니다.' }, { status: 400 })
    }

    // 미션 생성
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .insert({
        teacher_id: user.id,
        title,
        description,
        type,
        verification_method,
        book_id: type === 'book_reading' ? book_id : null,
        book_title: type === 'book_reading' ? book_title : null,
        book_author: type === 'book_reading' ? book_author : null,
        book_isbn: type === 'book_reading' ? book_isbn : null,
        mission_content: type === 'general' ? mission_content : null,
        points
      })
      .select()
      .single()

    if (missionError) {
      console.error('[Create Mission] Error:', missionError)
      return NextResponse.json({ success: false, error: '미션 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, mission })
  } catch (error: any) {
    console.error('[Create Mission] Unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || '미션 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

