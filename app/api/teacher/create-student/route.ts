import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

function getEnv(key: string) {
  const raw = process.env[key]
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

type CreateStudentBody = {
  email: string
  password: string
  name: string
}

export async function POST(request: NextRequest) {
  try {
    // 요청자 확인 (교사만 가능)
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
      return NextResponse.json({ success: false, error: '교사만 학생 계정을 생성할 수 있습니다.' }, { status: 403 })
    }

    // 요청 본문 파싱
    let body: CreateStudentBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: '이메일, 비밀번호, 이름을 모두 입력해주세요.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 })
    }

    // Service Role Key로 관리자 클라이언트 생성
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 학생 계정 생성
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name,
        role: 'student'
      }
    })

    if (createError) {
      console.error('[Create Student] User creation error:', createError)
      return NextResponse.json({ success: false, error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ success: false, error: '계정 생성에 실패했습니다.' }, { status: 500 })
    }

    // 프로필 업데이트 (트리거로 자동 생성되지만, 확실히 하기 위해)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        name,
        role: 'student',
        status: 'active',
        level: 1,
        points: 0
      })

    if (profileError) {
      console.error('[Create Student] Profile creation error:', profileError)
      // 계정은 생성되었지만 프로필 생성 실패 - 계정은 유지
      return NextResponse.json({ 
        success: true, 
        message: '계정은 생성되었지만 프로필 생성에 문제가 있었습니다.',
        userId: newUser.user.id
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: '학생 계정이 생성되었습니다.',
      userId: newUser.user.id
    })
  } catch (error: any) {
    console.error('[Create Student] Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || '학생 계정 생성 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}

