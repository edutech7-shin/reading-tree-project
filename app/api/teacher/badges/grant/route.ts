import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type GrantBody = {
  class_student_ids: string[]
  badge_id: number
  comment?: string | null
}

/** 교사가 선택한 학생(들)에게 수동(manual) 배지 부여 */
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
      return NextResponse.json({ success: false, error: '교사만 배지를 부여할 수 있습니다.' }, { status: 403 })
    }

    let body: GrantBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { class_student_ids, badge_id, comment } = body

    if (!Array.isArray(class_student_ids) || class_student_ids.length === 0) {
      return NextResponse.json({ success: false, error: '학생을 1명 이상 선택해주세요.' }, { status: 400 })
    }
    if (!badge_id || typeof badge_id !== 'number') {
      return NextResponse.json({ success: false, error: '배지가 필요합니다.' }, { status: 400 })
    }

    const { data: granted, error: rpcError } = await supabase.rpc('grant_badges_to_students', {
      p_teacher_id: user.id,
      p_class_student_ids: class_student_ids,
      p_badge_id: badge_id,
      p_comment: comment || null,
    })

    if (rpcError) {
      console.error('[API /teacher/badges/grant] RPC error:', rpcError)
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, granted: granted ?? 0 })
  } catch (e: unknown) {
    console.error('[API /teacher/badges/grant] Unexpected error:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '배지 부여 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
