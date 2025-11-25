import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

type AssignMissionBody = {
  mission_id: number
  student_ids: string[] // class_students.id 배열
  start_date: string // YYYY-MM-DD
  end_date?: string // YYYY-MM-DD (null이면 기한 없음)
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
      return NextResponse.json({ success: false, error: '교사만 미션을 할당할 수 있습니다.' }, { status: 403 })
    }

    let body: AssignMissionBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { mission_id, student_ids, start_date, end_date } = body

    if (!mission_id || !student_ids || student_ids.length === 0 || !start_date) {
      return NextResponse.json({ success: false, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    // 미션이 해당 교사의 것인지 확인
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, teacher_id')
      .eq('id', mission_id)
      .single()

    if (missionError || !mission || mission.teacher_id !== user.id) {
      return NextResponse.json({ success: false, error: '미션을 찾을 수 없거나 권한이 없습니다.' }, { status: 403 })
    }

    // 학생들이 해당 교사의 학생인지 확인
    const { data: students, error: studentsError } = await supabase
      .from('class_students')
      .select('id')
      .eq('teacher_id', user.id)
      .in('id', student_ids)

    if (studentsError) {
      return NextResponse.json({ success: false, error: '학생 정보를 확인할 수 없습니다.' }, { status: 500 })
    }

    if (students.length !== student_ids.length) {
      return NextResponse.json({ success: false, error: '일부 학생을 찾을 수 없습니다.' }, { status: 400 })
    }

    // 미션 할당
    const assignments = student_ids.map(student_id => ({
      mission_id,
      student_id,
      start_date,
      end_date: end_date || null,
      status: 'active'
    }))

    const { data: createdAssignments, error: assignError } = await supabase
      .from('mission_assignments')
      .insert(assignments)
      .select()

    if (assignError) {
      console.error('[Assign Mission] Error:', assignError)
      return NextResponse.json({ success: false, error: '미션 할당에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, assignments: createdAssignments })
  } catch (error: any) {
    console.error('[Assign Mission] Unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || '미션 할당 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

