'use client'

import { useState } from 'react'

export type Badge = {
  id: number
  code: string | null
  name: string
  description: string | null
  image_url: string
  badge_type: string
  acquisition_hint: string | null
  sort_order: number
}

export type UserBadge = {
  id: number
  badge_id: number
  earned_at: string
  teacher_comment: string | null
}

type Props = {
  badges: Badge[]
  userBadges: UserBadge[]
}

/** 나의 배지 숲: 획득/미획득 배지 그리드, 클릭 시 상세 모달(획득: 날짜·축하 / 미획득: 힌트) */
export function MyBadgeForest({ badges, userBadges }: Props) {
  const [modal, setModal] = useState<{
    badge: Badge
    earned?: UserBadge
  } | null>(null)

  const earnedMap = new Map(userBadges.map((ub) => [ub.badge_id, ub]))
  const sorted = [...badges].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>🦔 나의 배지 숲</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          독서 활동을 통해 동물 친구 배지를 모아보세요!
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: 12,
          }}
        >
          {sorted.map((b) => {
            const earned = earnedMap.get(b.id)
            const isEarned = !!earned
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setModal({ badge: b, earned: earned ?? undefined })}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                }}
                aria-label={isEarned ? `${b.name} 배지 (획득)` : `${b.name} 배지 (미획득)`}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    filter: isEarned ? 'none' : 'grayscale(1) opacity(0.7)',
                    position: 'relative',
                  }}
                >
                  <img
                    src={b.image_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                  />
                  {!isEarned && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        fontSize: 14,
                        filter: 'none',
                      }}
                      aria-hidden
                    >
                      🔒
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: isEarned ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    fontWeight: isEarned ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.name}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-detail-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}
          onClick={() => setModal(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 320,
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 100,
                height: 100,
                margin: '0 auto 12px',
                borderRadius: 20,
                overflow: 'hidden',
                filter: modal.earned ? 'none' : 'grayscale(1) opacity(0.75)',
              }}
            >
              <img
                src={modal.badge.image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <h2 id="badge-detail-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
              {modal.badge.name}
            </h2>
            {modal.earned ? (
              <>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {modal.badge.description || '축하해요!'}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {new Date(modal.earned.earned_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  획득
                </p>
                {modal.earned.teacher_comment && (
                  <p
                    style={{
                      margin: '0 0 12px',
                      padding: 8,
                      background: 'var(--color-bg-secondary)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      textAlign: 'left',
                    }}
                  >
                    💬 {modal.earned.teacher_comment}
                  </p>
                )}
              </>
            ) : (
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                💡 {modal.badge.acquisition_hint || '이 배지를 얻을 수 있는 방법을 찾아보세요!'}
              </p>
            )}
            <button type="button" className="btn primary" onClick={() => setModal(null)} style={{ minWidth: 100 }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
