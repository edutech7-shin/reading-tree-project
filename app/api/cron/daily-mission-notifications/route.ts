import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Vercel Cron이나 외부 스케줄러에서 호출할 수 있는 API 엔드포인트
// 보안을 위해 Authorization 헤더나 특정 토큰을 확인할 수 있습니다

export async function GET(request: NextRequest) {
  try {
    // 보안: Authorization 헤더 확인 (Vercel Cron은 자동으로 헤더를 추가합니다)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Vercel Cron이 아닌 경우, CRON_SECRET 확인
    if (!authHeader && cronSecret) {
      const providedSecret = request.nextUrl.searchParams.get('secret')
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 매일 미션 알림 생성 함수 호출
    const { data, error } = await supabase.rpc('create_daily_mission_notifications')

    if (error) {
      console.error('[Daily Mission Notifications] Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Created ${data || 0} daily mission notifications`,
      count: data || 0
    })
  } catch (error: any) {
    console.error('[Daily Mission Notifications] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST 메서드도 지원 (더 안전한 방법)
export async function POST(request: NextRequest) {
  return GET(request)
}

