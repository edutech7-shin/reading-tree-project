'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../../../../lib/supabase/client'

type Completion = {
  id: number
  assignment_id: number
  student_id: string
  proof_text: string | null
  proof_image_url: string | null
  completed_at: string
  mission_assignments: {
    mission_id: number
    missions: {
      id: number
      title: string
      type: string
      points: number
    }
  }
  class_students: {
    id: string
    name: string
  }
}

type Props = {
  completions: Completion[]
}

export function ApproveMissionsDashboard({ completions: initialCompletions }: Props) {
  const [completions, setCompletions] = useState(initialCompletions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})

  async function loadCompletions() {
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: completionsData } = await supabase
      .from('mission_completions')
      .select(`
        id,
        assignment_id,
        student_id,
        proof_text,
        proof_image_url,
        completed_at,
        mission_assignments (
          mission_id,
          missions (
            id,
            title,
            type,
            points,
            teacher_id
          )
        ),
        class_students (
          id,
          name
        )
      `)
      .eq('verification_status', 'pending')
      .order('completed_at', { ascending: false })

    if (completionsData) {
      // 교사의 미션만 필터링
      const filtered = completionsData.filter((c: any) => {
        return c.mission_assignments?.missions?.teacher_id === user.id
      })
      setCompletions(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCompletions()
  }, [])

  async function approve(id: number) {
    setError(null)
    const comment = comments[id]?.trim() || null

    const response = await fetch('/api/teacher/missions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completion_id: id,
        approved: true,
        comment
      })
    })

    const data = await response.json()

    if (!data.success) {
      setError(data.error || '승인에 실패했습니다.')
      return
    }

    await loadCompletions()
    setComments({ ...comments, [id]: '' })
  }

  async function reject(id: number) {
    setError(null)
    const comment = comments[id]?.trim() || null

    const response = await fetch('/api/teacher/missions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completion_id: id,
        approved: false,
        comment
      })
    })

    const data = await response.json()

    if (!data.success) {
      setError(data.error || '반려에 실패했습니다.')
      return
    }

    await loadCompletions()
    setComments({ ...comments, [id]: '' })
  }

  if (completions.length === 0) {
    return (
      <div>
        <h1>미션 승인</h1>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--grid-gap-lg)' }}>
          <p style={{ color: '#666' }}>승인 대기 중인 미션이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>미션 승인</h1>
      
      {error && (
        <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginBottom: 'var(--grid-gap-md)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--grid-gap-md)' }}>
        {completions.map((completion) => {
          const mission = completion.mission_assignments.missions
          const student = completion.class_students
          return (
            <div key={completion.id} className="card">
              <div style={{ marginBottom: 'var(--grid-gap-sm)' }}>
                <h3 style={{ margin: 0, marginBottom: 'var(--grid-gap-xs)' }}>{mission.title}</h3>
                <div style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
                  학생: {student.name} | 포인트: 💧 {mission.points}점
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: '#999', marginTop: 4 }}>
                  완료 신청: {new Date(completion.completed_at).toLocaleString('ko-KR')}
                </div>
              </div>

              {completion.proof_text && (
                <div style={{ marginBottom: 'var(--grid-gap-sm)', padding: 'var(--grid-gap-sm)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--radius-small)' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)' }}>완료 증빙:</strong>
                  <p style={{ margin: 'var(--grid-gap-xs) 0 0 0', fontSize: 'var(--font-size-sm)' }}>{completion.proof_text}</p>
                </div>
              )}

              {completion.proof_image_url && (
                <div style={{ marginBottom: 'var(--grid-gap-sm)' }}>
                  <img
                    src={completion.proof_image_url}
                    alt="완료 증빙"
                    style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--radius-small)' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 'var(--grid-gap-sm)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  코멘트 (선택사항)
                </label>
                <textarea
                  value={comments[completion.id] || ''}
                  onChange={(e) => setComments({ ...comments, [completion.id]: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-sm)' }}
                  placeholder="승인 또는 반려 사유를 입력하세요"
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)' }}>
                <button
                  className="btn primary"
                  onClick={() => approve(completion.id)}
                  disabled={loading}
                >
                  ✅ 승인
                </button>
                <button
                  className="btn"
                  onClick={() => reject(completion.id)}
                  disabled={loading}
                  style={{ backgroundColor: 'var(--color-negative)', color: 'white' }}
                >
                  ❌ 반려
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

