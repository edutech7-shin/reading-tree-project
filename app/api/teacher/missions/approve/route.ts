import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type ApproveMissionBody = {
  completion_id: number
  approved: boolean
  comment?: string
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
      return NextResponse.json({ success: false, error: '교사만 미션을 승인할 수 있습니다.' }, { status: 403 })
    }

    let body: ApproveMissionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { completion_id, approved, comment } = body

    if (!completion_id) {
      return NextResponse.json({ success: false, error: '완료 ID가 필요합니다.' }, { status: 400 })
    }

    // 완료 기록 확인
    const { data: completion, error: completionError } = await supabase
      .from('mission_completions')
      .select(`
        id,
        assignment_id,
        student_id,
        verification_status,
        mission_assignments (
          mission_id,
          missions (
            teacher_id
          )
        )
      `)
      .eq('id', completion_id)
      .single()

    if (completionError || !completion) {
      return NextResponse.json({ success: false, error: '완료 기록을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (completion.verification_status !== 'pending') {
      return NextResponse.json({ success: false, error: '이미 처리된 완료 기록입니다.' }, { status: 400 })
    }

    const assignment = completion.mission_assignments as any
    const mission = assignment.missions as any

    // 교사가 해당 미션의 소유자인지 확인
    if (mission.teacher_id !== user.id) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    if (approved) {
      // 승인 처리
      const { error: approveError } = await supabase.rpc('approve_mission_completion', {
        p_completion_id: completion_id,
        p_teacher_id: user.id,
        p_comment: comment || null
      })

      if (approveError) {
        console.error('[Approve Mission] Error:', approveError)
        return NextResponse.json({ success: false, error: '미션 승인에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '미션이 승인되었습니다.' })
    } else {
      // 반려 처리
      const { error: rejectError } = await supabase
        .from('mission_completions')
        .update({
          verification_status: 'rejected',
          teacher_id: user.id,
          teacher_comment: comment || null,
          verified_at: new Date().toISOString()
        })
        .eq('id', completion_id)

      if (rejectError) {
        console.error('[Reject Mission] Error:', rejectError)
        return NextResponse.json({ success: false, error: '미션 반려에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '미션이 반려되었습니다.' })
    }
  } catch (error: any) {
    console.error('[Approve Mission] Unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || '미션 승인 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

