'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '../../../../lib/supabase/client'

type Student = {
  id: string
  name: string
  student_number: number
}

type Props = {
  students: Student[]
}

export function CreateMissionForm({ students }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'book_reading' | 'general'>('book_reading')
  const [verificationMethod, setVerificationMethod] = useState<'self' | 'teacher'>('self')
  const [points, setPoints] = useState(5)
  
  // 책 읽기 미션 필드
  const [bookId, setBookId] = useState<number | null>(null)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookIsbn, setBookIsbn] = useState('')
  
  // 일반 미션 필드
  const [missionContent, setMissionContent] = useState('')
  
  // 할당 설정
  const [assignNow, setAssignNow] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 미션 생성
      const response = await fetch('/api/teacher/missions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          type,
          verification_method: verificationMethod,
          book_id: type === 'book_reading' ? bookId : null,
          book_title: type === 'book_reading' ? bookTitle : null,
          book_author: type === 'book_reading' ? bookAuthor : null,
          book_isbn: type === 'book_reading' ? bookIsbn : null,
          mission_content: type === 'general' ? missionContent : null,
          points
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '미션 생성에 실패했습니다.')
      }

      // 즉시 할당이 선택된 경우
      if (assignNow && selectedStudents.length > 0 && startDate) {
        const assignResponse = await fetch('/api/teacher/missions/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mission_id: data.mission.id,
            student_ids: selectedStudents,
            start_date: startDate,
            end_date: endDate || null
          })
        })

        const assignData = await assignResponse.json()
        if (!assignData.success) {
          throw new Error(assignData.error || '미션 할당에 실패했습니다.')
        }
      }

      router.push('/teacher/missions')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>새 미션 만들기</h1>
      
      {error && (
        <div className="bg-negative-light text-negative" style={{ padding: 12, borderRadius: 6, marginBottom: 'var(--grid-gap-md)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            미션 제목 <span style={{ color: 'var(--color-negative)' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
            placeholder="예: 이번 주 독서 미션"
          />
        </div>

        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            미션 설명
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
            placeholder="미션에 대한 자세한 설명을 입력하세요"
          />
        </div>

        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            미션 타입 <span style={{ color: 'var(--color-negative)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                value="book_reading"
                checked={type === 'book_reading'}
                onChange={(e) => setType(e.target.value as 'book_reading')}
              />
              📚 책 읽기
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                value="general"
                checked={type === 'general'}
                onChange={(e) => setType(e.target.value as 'general')}
              />
              📝 일반 미션
            </label>
          </div>
        </div>

        {type === 'book_reading' && (
          <div style={{ marginBottom: 'var(--grid-gap-md)', padding: 'var(--grid-gap-md)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--radius-medium)' }}>
            <h4 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>책 정보</h4>
            <div style={{ display: 'grid', gap: 'var(--grid-gap-sm)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  책 제목
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
                  placeholder="예: 해리포터와 마법사의 돌"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  저자
                </label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
                  placeholder="예: J.K. 롤링"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  ISBN (선택사항)
                </label>
                <input
                  type="text"
                  value={bookIsbn}
                  onChange={(e) => setBookIsbn(e.target.value)}
                  style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
                  placeholder="예: 9788983921985"
                />
              </div>
            </div>
          </div>
        )}

        {type === 'general' && (
          <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              미션 내용
            </label>
            <textarea
              value={missionContent}
              onChange={(e) => setMissionContent(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
              placeholder="예: 이번 주에 독서록 3개를 작성하세요"
            />
          </div>
        )}

        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            확인 방법 <span style={{ color: 'var(--color-negative)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 'var(--grid-gap-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                value="self"
                checked={verificationMethod === 'self'}
                onChange={(e) => setVerificationMethod(e.target.value as 'self')}
              />
              ✅ 자율 확인 (학생이 직접 체크)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                value="teacher"
                checked={verificationMethod === 'teacher'}
                onChange={(e) => setVerificationMethod(e.target.value as 'teacher')}
              />
              👨‍🏫 교사 확인 (교사가 확인 후 승인)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--grid-gap-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
            완료 시 포인트 <span style={{ color: 'var(--color-negative)' }}>*</span>
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            min={1}
            required
            style={{ width: 150, padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
          />
          <span style={{ marginLeft: 'var(--grid-gap-xs)', color: '#666' }}>💧 물방울</span>
        </div>

        <div style={{ marginBottom: 'var(--grid-gap-md)', padding: 'var(--grid-gap-md)', backgroundColor: 'var(--color-background-secondary)', borderRadius: 'var(--radius-medium)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--grid-gap-sm)' }}>
            <input
              type="checkbox"
              checked={assignNow}
              onChange={(e) => setAssignNow(e.target.checked)}
            />
            <strong>지금 바로 학생들에게 할당하기</strong>
          </label>

          {assignNow && (
            <div style={{ marginTop: 'var(--grid-gap-md)' }}>
              <div style={{ marginBottom: 'var(--grid-gap-sm)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                  대상 학생 선택
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--grid-gap-xs)' }}>
                  {students.map((student) => (
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--grid-gap-sm)', marginBottom: 'var(--grid-gap-sm)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
                    시작일 <span style={{ color: 'var(--color-negative)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required={assignNow}
                    style={{ width: '100%', padding: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-md)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--grid-gap-xs)', fontSize: 'var(--font-size-sm)' }}>
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
            </div>
          )}
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
            disabled={loading}
          >
            {loading ? '생성 중...' : '미션 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}

