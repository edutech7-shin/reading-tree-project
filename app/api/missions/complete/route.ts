import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type CompleteMissionBody = {
  assignment_id: number
  proof_text?: string
  proof_image_url?: string
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
      .select('role, name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'student') {
      return NextResponse.json({ success: false, error: '학생만 미션을 완료할 수 있습니다.' }, { status: 403 })
    }

    let body: CompleteMissionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { assignment_id, proof_text, proof_image_url } = body

    if (!assignment_id) {
      return NextResponse.json({ success: false, error: '할당 ID가 필요합니다.' }, { status: 400 })
    }

    // 할당 정보 확인
    const { data: assignment, error: assignmentError } = await supabase
      .from('mission_assignments')
      .select(`
        id,
        student_id,
        status,
        mission_id,
        missions (
          id,
          verification_method,
          points
        )
      `)
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: '미션 할당을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (assignment.status !== 'active') {
      return NextResponse.json({ success: false, error: '이미 완료되었거나 만료된 미션입니다.' }, { status: 400 })
    }

    // 학생이 해당 할당의 소유자인지 확인 (name으로 매칭)
    const { data: student, error: studentError } = await supabase
      .from('class_students')
      .select('id, name')
      .eq('id', assignment.student_id)
      .single()

    if (studentError || !student || student.name !== profile.name) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
    }

    const mission = assignment.missions as any

    // 자율 확인 방식이면 즉시 완료 처리
    if (mission.verification_method === 'self') {
      const { error: completeError } = await supabase.rpc('complete_mission_and_reward', {
        p_assignment_id: assignment_id,
        p_verification_method: 'self'
      })

      if (completeError) {
        console.error('[Complete Mission] Error:', completeError)
        return NextResponse.json({ success: false, error: '미션 완료 처리에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '미션이 완료되었습니다!' })
    } else {
      // 교사 확인 방식이면 대기 상태로 완료 기록 생성
      const { data: completion, error: completionError } = await supabase
        .from('mission_completions')
        .insert({
          assignment_id,
          student_id: assignment.student_id,
          verified_by: 'teacher',
          verification_status: 'pending',
          proof_text: proof_text || null,
          proof_image_url: proof_image_url || null
        })
        .select()
        .single()

      if (completionError) {
        console.error('[Complete Mission] Error:', completionError)
        return NextResponse.json({ success: false, error: '미션 완료 신청에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '미션 완료 신청이 제출되었습니다. 교사 확인을 기다려주세요.' })
    }
  } catch (error: any) {
    console.error('[Complete Mission] Unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || '미션 완료 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

