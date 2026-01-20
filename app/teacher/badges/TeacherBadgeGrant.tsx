'use client'

import { useState } from 'react'

export type Student = { id: string; studentNumber: number; name: string }
export type Badge = { id: number; name: string; description: string | null; image_url: string; acquisition_hint: string | null }

type Props = {
  students: Student[]
  badges: Badge[]
}

export function TeacherBadgeGrant({ students, badges }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === students.length) setSelected(new Set())
    else setSelected(new Set(students.map((s) => s.id)))
  }

  const grant = async (badgeId: number, badgeName: string) => {
    if (selected.size === 0) {
      setMessage({ type: 'err', text: '학생을 1명 이상 선택해주세요.' })
      return
    }
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/teacher/badges/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          class_student_ids: Array.from(selected),
          badge_id: badgeId,
          comment: comment.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'err', text: data?.error || '부여에 실패했습니다.' })
        return
      }
      setMessage({ type: 'ok', text: `${data.granted ?? 0}명에게 "${badgeName}" 배지를 부여했어요.` })
      setComment('')
    } finally {
      setPending(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>🏅 배지 부여</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          학생을 선택한 뒤, 부여할 배지를 클릭하세요. (교사 부여 전용 배지만 표시됩니다.)
        </p>
      </header>

      {/* 학생 선택 */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>학생 선택</h3>
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn" onClick={toggleAll} style={{ fontSize: 13 }}>
            {selected.size === students.length ? '전체 해제' : '전체 선택'}
          </button>
          <span style={{ marginLeft: 12, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {selected.size}명 선택됨
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {students.map((s) => (
            <label
              key={s.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                border: `1px solid ${selected.has(s.id) ? 'var(--color-primary)' : 'var(--color-border-medium)'}`,
                borderRadius: 8,
                background: selected.has(s.id) ? 'var(--color-primary-light, rgba(34,197,94,0.1))' : 'transparent',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                style={{ width: 18, height: 18 }}
              />
              <span>{s.studentNumber}번 {s.name}</span>
            </label>
          ))}
        </div>
        {students.length === 0 && (
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>등록된 학생이 없습니다.</p>
        )}
      </div>

      {/* 선생님 코멘트 (선택) */}
      <div className="card">
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
          선생님 코멘트 (선택)
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="예: 깊이 있는 서평 잘 썼어요!"
          style={{ width: '100%', maxWidth: 400, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border-medium)' }}
        />
      </div>

      {/* 배지 카드: 클릭 시 선택 학생에게 부여 */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>부여할 배지 (클릭 한 번으로 부여)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => grant(b.id, b.name)}
              disabled={pending || students.length === 0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                border: '2px solid var(--color-border-medium)',
                borderRadius: 16,
                background: 'var(--color-bg-secondary)',
                cursor: pending || students.length === 0 ? 'not-allowed' : 'pointer',
                opacity: pending || students.length === 0 ? 0.7 : 1,
                minWidth: 120,
              }}
            >
              <img src={b.image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12 }} />
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{b.name}</span>
              {b.acquisition_hint && (
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                  {b.acquisition_hint}
                </span>
              )}
            </button>
          ))}
        </div>
        {badges.length === 0 && (
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>교사 부여용 배지가 없습니다.</p>
        )}
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            fontSize: 14,
            background: message.type === 'ok' ? 'var(--color-positive-light, rgba(34,197,94,0.15))' : 'var(--color-negative-light, rgba(239,68,68,0.12))',
            color: message.type === 'ok' ? 'var(--color-positive, #166534)' : 'var(--color-negative, #b91c1c)',
          }}
        >
          {message.text}
        </div>
      )}
    </section>
  )
}
