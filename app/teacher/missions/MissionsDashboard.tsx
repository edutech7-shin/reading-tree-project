'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../../../lib/supabase/client'

type Mission = {
  id: number
  title: string
  description: string | null
  type: 'book_reading' | 'general'
  verification_method: 'self' | 'teacher'
  points: number
  is_active: boolean
  created_at: string
}

type AssignmentsStats = Record<number, { total: number; completed: number; active: number }>

type Props = {
  missions: Mission[]
  assignmentsStats: AssignmentsStats
}

export function MissionsDashboard({ missions: initialMissions, assignmentsStats: initialStats }: Props) {
  const router = useRouter()
  const [missions, setMissions] = useState(initialMissions)
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)

  async function loadMissions() {
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: missionsData } = await supabase
      .from('missions')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (missionsData) {
      setMissions(missionsData)
      
      const missionIds = missionsData.map(m => m.id)
      if (missionIds.length > 0) {
        const { data: assignments } = await supabase
          .from('mission_assignments')
          .select('mission_id, status')
          .in('mission_id', missionIds)

        const newStats = (assignments || []).reduce((acc, a) => {
          if (!acc[a.mission_id]) {
            acc[a.mission_id] = { total: 0, completed: 0, active: 0 }
          }
          acc[a.mission_id].total++
          if (a.status === 'completed') acc[a.mission_id].completed++
          if (a.status === 'active') acc[a.mission_id].active++
          return acc
        }, {} as AssignmentsStats)
        setStats(newStats)
      }
    }
    setLoading(false)
  }

  async function deleteMission(id: number) {
    if (!confirm('이 미션을 삭제하시겠습니까? 할당된 미션도 함께 삭제됩니다.')) {
      return
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', id)

    if (error) {
      alert('미션 삭제에 실패했습니다: ' + error.message)
      return
    }

    await loadMissions()
  }

  async function toggleActive(id: number, currentActive: boolean) {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('missions')
      .update({ is_active: !currentActive })
      .eq('id', id)

    if (error) {
      alert('상태 변경에 실패했습니다: ' + error.message)
      return
    }

    await loadMissions()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--grid-gap-md)' }}>
        <h1>미션 관리</h1>
        <button className="btn primary" onClick={() => router.push('/teacher/missions/create')}>
          ＋ 새 미션 만들기
        </button>
      </div>

      {missions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--grid-gap-lg)' }}>
          <p style={{ color: '#666', marginBottom: 'var(--grid-gap-md)' }}>아직 생성된 미션이 없습니다.</p>
          <button className="btn primary" onClick={() => router.push('/teacher/missions/create')}>
            첫 미션 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
          {missions.map((mission) => {
            const stat = stats[mission.id] || { total: 0, completed: 0, active: 0 }
            return (
              <div key={mission.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--grid-gap-sm)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--grid-gap-xs)', marginBottom: 'var(--grid-gap-xs)' }}>
                      <h3 style={{ margin: 0 }}>{mission.title}</h3>
                      <span style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        padding: '2px 8px', 
                        borderRadius: 12, 
                        backgroundColor: mission.is_active ? '#e8f5e9' : '#f5f5f5',
                        color: mission.is_active ? '#2e7d32' : '#666'
                      }}>
                        {mission.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                    {mission.description && (
                      <p style={{ color: '#666', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--grid-gap-xs)' }}>
                        {mission.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--grid-gap-md)', fontSize: 'var(--font-size-sm)', color: '#666' }}>
                      <span>타입: {mission.type === 'book_reading' ? '📚 책 읽기' : '📝 일반 미션'}</span>
                      <span>확인: {mission.verification_method === 'self' ? '✅ 자율 확인' : '👨‍🏫 교사 확인'}</span>
                      <span>포인트: 💧 {mission.points}점</span>
                    </div>
                    <div style={{ marginTop: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-sm)' }}>
                      <span style={{ color: '#666' }}>
                        할당: {stat.total}명 | 완료: {stat.completed}명 | 진행 중: {stat.active}명
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--grid-gap-xs)' }}>
                    <button
                      className="btn"
                      onClick={() => router.push(`/teacher/missions/${mission.id}/assign`)}
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      할당하기
                    </button>
                    <button
                      className="btn"
                      onClick={() => toggleActive(mission.id, mission.is_active)}
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      {mission.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      className="btn"
                      onClick={() => deleteMission(mission.id)}
                      style={{ fontSize: 'var(--font-size-sm)', backgroundColor: 'var(--color-negative)', color: 'white' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

