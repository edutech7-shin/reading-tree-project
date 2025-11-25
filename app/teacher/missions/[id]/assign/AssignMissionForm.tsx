'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mission = {
  id: number
  title: string
  description: string | null
  type: string
  verification_method: string
  points: number
}

type Student = {
  id: string
  name: string
  student_number: number
}

type Props = {
  mission: Mission
  students: Student[]
  assignedStudentIds: Set<string>
}

export function AssignMissionForm({ mission, students, assignedStudentIds }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (selectedStudents.length === 0) {
      setError('최소 한 명의 학생을 선택해주세요.')
      setLoading(false)
      return
    }

    if (!startDate) {
      setError('시작일을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/teacher/missions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mission_id: mission.id,
          student_ids: selectedStudents,
          start_date: startDate,
          end_date: endDate || null
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '미션 할당에 실패했습니다.')
      }

      router.push('/teacher/missions')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const availableStudents = students.filter(s => !assignedStudentIds.has(s.id))

  return (
    <div>
      <h1>미션 할당하기</h1>
      <div className="card" style={{ marginBottom: 'var(--grid-gap-md)' }}>
        <h3 style={{ marginTop: 0 }}>{mission.title}</h3>
        {mission.description && <p style={{ color: '#666' }}>{mission.description}</p>}
        <div style={{ fontSize: 'var(--font-size-sm)', color: '#666' }}>
          타입: {mission.type === 'book_reading' ? '📚 책 읽기' : '📝 일반 미션'} | 
          확인: {mission.verification_method === 'self' ? '✅ 자율 확인' : '👨‍🏫 교사 확인'} | 
          포인트: 💧 {mission.points}점
        </div>
      </div>

      {error && (
        <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginBottom: 'var(--grid-gap-md)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            대상 학생 선택 <span style={{ color: 'var(--color-negative)' }}>*</span>
          </label>
          {availableStudents.length === 0 ? (
            <p style={{ color: '#666', fontSize: 'var(--font-size-sm)' }}>모든 학생에게 이미 할당되었습니다.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--grid-gap-xs)' }}>
              {availableStudents.map((student) => (
                <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.id])
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                      }
                    }}
                  />
                  {student.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--grid-gap-sm)', marginBottom: 'var(--grid-gap-md)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              시작일 <span style={{ color: 'var(--color-negative)' }}>*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              종료일 (선택사항)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            onClick={() => router.back()}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={loading || availableStudents.length === 0}
          >
            {loading ? '할당 중...' : '할당하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

