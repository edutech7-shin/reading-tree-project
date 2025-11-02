import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

type ProfileRole = 'student' | 'teacher'

function getEnv(key: string) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[api/profile] 환경 변수 ${key}가 설정되어 있지 않습니다.`)
  }
  return value
}

export async function POST(request: NextRequest) {
  let body: { nickname?: string; role?: ProfileRole }

  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const role = body.role

  if (!nickname) {
    return NextResponse.json({ success: false, error: '닉네임을 입력해주세요.' }, { status: 400 })
  }
  if (role !== 'student' && role !== 'teacher') {
    return NextResponse.json({ success: false, error: '올바른 역할을 선택해주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: sessionError
  } = await supabase.auth.getUser()

  if (sessionError || !user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let adminClient
  try {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (envError: any) {
    console.error('[api/profile] 환경 변수 오류:', envError)
    return NextResponse.json({ success: false, error: '서버가 올바르게 구성되지 않았습니다.' }, { status: 500 })
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      nickname,
      role,
      level: 1,
      points: 0
    })
    .eq('id', user.id)

  if (error) {
    console.error('[api/profile] 프로필 업데이트 실패:', error)
    return NextResponse.json({ success: false, error: '프로필을 저장하지 못했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
