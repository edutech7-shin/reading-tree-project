import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../lib/supabase/server'
import { MissionsDashboard } from './MissionsDashboard'

export const dynamic = 'force-dynamic'

export default async function MissionsPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'teacher') {
    redirect('/')
  }

  // 미션 목록 가져오기
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (missionsError) {
    throw new Error('미션 정보를 불러올 수 없습니다.')
  }

  // 각 미션의 할당 통계 가져오기
  const missionIds = (missions || []).map(m => m.id)
  let assignmentsStats: Record<number, { total: number; completed: number; active: number }> = {}

  if (missionIds.length > 0) {
    const { data: assignments } = await supabase
      .from('mission_assignments')
      .select('mission_id, status')
      .in('mission_id', missionIds)

    assignmentsStats = (assignments || []).reduce((acc, a) => {
      if (!acc[a.mission_id]) {
        acc[a.mission_id] = { total: 0, completed: 0, active: 0 }
      }
      acc[a.mission_id].total++
      if (a.status === 'completed') acc[a.mission_id].completed++
      if (a.status === 'active') acc[a.mission_id].active++
      return acc
    }, {} as Record<number, { total: number; completed: number; active: number }>)
  }

  return (
    <main className='container'>
      <MissionsDashboard missions={missions || []} assignmentsStats={assignmentsStats} />
    </main>
  )
}

