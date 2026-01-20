import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

/** 독서 기록 생성 (book_records insert) + 트리거 배지 자동 체크 후 badge_earned 반환 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    let body: {
      book_title?: string | null
      book_author?: string | null
      book_cover_url?: string | null
      book_publisher?: string | null
      book_isbn?: string | null
      book_publication_date?: string | null
      book_total_pages?: number | null
      record_date: string
      short_comment?: string | null
      content_text?: string | null
      content_image_url?: string | null
      rating?: number | null
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const recordDate = body.record_date || new Date().toISOString().slice(0, 10)

    const { data: record, error: insertError } = await supabase
      .from('book_records')
      .insert({
        user_id: user.id,
        book_title: body.book_title ?? null,
        book_author: body.book_author ?? null,
        book_cover_url: body.book_cover_url ?? null,
        book_publisher: body.book_publisher ?? null,
        book_isbn: body.book_isbn ?? null,
        book_publication_date: body.book_publication_date || null,
        book_total_pages: body.book_total_pages ?? null,
        record_date: recordDate,
        short_comment: body.short_comment ?? null,
        content_text: body.content_text ?? null,
        content_image_url: body.content_image_url ?? null,
        rating: body.rating ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[API /records] Insert error:', insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    // 트리거 배지 체크 (기록 저장 시점)
    const { data: newBadges, error: rpcError } = await supabase.rpc('check_and_award_trigger_badges', {
      p_user_id: user.id,
    })

    if (rpcError) {
      console.error('[API /records] check_and_award_trigger_badges error:', rpcError)
      // 배지 RPC 실패해도 기록 생성은 성공으로
    }

    // 가장 최근에 획득한 배지 1개만 모달용으로 반환 (여러 개면 첫 번째)
    const badgeEarned =
      Array.isArray(newBadges) && newBadges.length > 0
        ? (newBadges as { badge_id: number; name: string; description: string; image_url: string; earned_at: string }[])[0]
        : undefined

    return NextResponse.json({
      success: true,
      record_id: record?.id,
      badge_earned: badgeEarned
        ? {
            id: badgeEarned.badge_id,
            name: badgeEarned.name,
            description: badgeEarned.description,
            image_url: badgeEarned.image_url,
            earned_at: badgeEarned.earned_at,
          }
        : undefined,
    })
  } catch (e: unknown) {
    console.error('[API /records] Unexpected error:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '제출 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
