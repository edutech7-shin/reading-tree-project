'use client'

import { useState } from 'react'
import { getSupabaseClient } from '../../../lib/supabase/client'

type Mission = {
  id: number
  title: string
  description: string | null
  type: string
  verification_method: string
  book_title: string | null
  book_author: string | null
  mission_content: string | null
  points: number
}

type Assignment = {
  id: number
  mission_id: number
  start_date: string
  end_date: string | null
  status: string
  assigned_at: string
  completed_at: string | null
  missions: Mission
}

type Completion = {
  assignment_id: number
  verification_status: string
  points_awarded: number
  completed_at: string
  verified_at: string | null
}

type Props = {
  assignments: Assignment[]
  completionsMap: Record<number, Completion>
  studentId: string
}

export function StudentMissionsDashboard({ assignments, completionsMap, studentId }: Props) {
  const [loading, setLoading] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [proofText, setProofText] = useState<Record<number, string>>({})

  async function completeMission(assignmentId: number) {
    setLoading({ ...loading, [assignmentId]: true })
    setError(null)

    try {
      const response = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          proof_text: proofText[assignmentId] || null
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '미션 완료에 실패했습니다.')
      }

      alert(data.message || '미션이 완료되었습니다!')
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setLoading({ ...loading, [assignmentId]: false })
    }
  }

  const activeMissions = assignments.filter(a => a.status === 'active')
  const completedMissions = assignments.filter(a => a.status === 'completed')
  const expiredMissions = assignments.filter(a => a.status === 'expired')

  function getDaysRemaining(endDate: string | null): number | null {
    if (!endDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  function renderMissionCard(assignment: Assignment) {
    const mission = assignment.missions
    const completion = completionsMap[assignment.id]
    const daysRemaining = getDaysRemaining(assignment.end_date)
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0

    return (
      <div key={assignment.id} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--grid-gap-sm)' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, marginBottom: 'var(--grid-gap-xs)' }}>{mission.title}</h3>
            {mission.description && (
              <p style={{ color: '#666', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--grid-gap-xs)' }}>
                {mission.description}
              </p>
            )}
            <div style={{ fontSize: 'var(--font-size-sm)', color: '#666', marginBottom: 'var(--grid-gap-xs)' }}>
              {mission.type === 'book_reading' ? (
                <span>📚 {mission.book_title} - {mission.book_author}</span>
              ) : (
                <span>📝 {mission.mission_content}</span>
              )}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
              포인트: 💧 {mission.points}점 | 
              확인: {mission.verification_method === 'self' ? '✅ 자율 확인' : '👨‍🏫 교사 확인'}
            </div>
            {assignment.end_date && (
              <div style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: isExpiringSoon ? 'var(--color-negative)' : '#666',
                marginTop: 'var(--grid-gap-xs)'
              }}>
                {daysRemaining !== null && daysRemaining >= 0 ? (
                  <>기한: {assignment.end_date} ({daysRemaining}일 남음)</>
                ) : (
                  <>기한: {assignment.end_date} (만료됨)</>
                )}
              </div>
            )}
            {completion && (
              <div style={{ marginTop: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                {completion.verification_status === 'pending' ? (
                  <span style={{ color: '#ff9800' }}>⏳ 교사 확인 대기 중...</span>
                ) : completion.verification_status === 'approved' ? (
                  <span style={{ color: '#2e7d32' }}>
                    ✅ 완료! 💧 {completion.points_awarded}점 획득
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-negative)' }}>❌ 반려됨</span>
                )}
              </div>
            )}
          </div>
        </div>

        {assignment.status === 'active' && !completion && (
          <div>
            {mission.verification_method === 'teacher' && (
              <div style={{ marginBottom: 'var(--grid-gap-sm)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  완료 증빙 (선택사항)
                </label>
                <textarea
                  value={proofText[assignment.id] || ''}
                  onChange={(e) => setProofText({ ...proofText, [assignment.id]: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-sm)' }}
                  placeholder="미션 완료 증빙을 입력하세요 (예: 책을 다 읽었습니다)"
                />
              </div>
            )}
            <button
              className="btn primary"
              onClick={() => completeMission(assignment.id)}
              disabled={loading[assignment.id]}
            >
              {loading[assignment.id] ? '처리 중...' : '✅ 미션 완료하기'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1>내 미션</h1>

      {error && (
        <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginBottom: 'var(--grid-gap-md)' }}>
          {error}
        </div>
      )}

      {activeMissions.length > 0 && (
        <section style={{ marginBottom: 'var(--grid-gap-lg)' }}>
          <h2 style={{ marginBottom: 'var(--grid-gap-md)' }}>📋 진행 중인 미션 ({activeMissions.length})</h2>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
            {activeMissions.map(renderMissionCard)}
          </div>
        </section>
      )}

      {completedMissions.length > 0 && (
        <section style={{ marginBottom: 'var(--grid-gap-lg)' }}>
          <h2 style={{ marginBottom: 'var(--grid-gap-md)' }}>✅ 완료한 미션 ({completedMissions.length})</h2>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
            {completedMissions.map(renderMissionCard)}
          </div>
        </section>
      )}

      {expiredMissions.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 'var(--grid-gap-md)' }}>⏰ 만료된 미션 ({expiredMissions.length})</h2>
          <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
            {expiredMissions.map(renderMissionCard)}
          </div>
        </section>
      )}

      {assignments.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--grid-gap-lg)' }}>
          <p style={{ color: '#666' }}>아직 할당된 미션이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

