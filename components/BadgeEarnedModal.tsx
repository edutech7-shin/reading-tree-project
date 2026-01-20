'use client'

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

export type BadgeEarned = {
  id: number
  name: string
  description?: string
  image_url: string
  earned_at?: string
}

type Props = {
  badge: BadgeEarned
  onClose: () => void
}

/** 배지 획득 시 폭죽 효과와 함께 보여주는 축하 모달 */
export function BadgeEarnedModal({ badge, onClose }: Props) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true

    const end = Date.now() + 800
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#22C55E', '#F472B6', '#8B5CF6', '#FBBF24'],
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#22C55E', '#F472B6', '#8B5CF6', '#FBBF24'],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()

    const t = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#F472B6', '#8B5CF6', '#FBBF24', '#3B82F6'],
      })
    }, 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          animation: 'badgePop 0.4s ease-out',
          transform: 'scale(1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes badgePop {
            0% { opacity: 0; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>
          🎉 배지를 획득했어요!
        </p>
        <div
          style={{
            width: 140,
            height: 140,
            margin: '0 auto 16px',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <img
            src={badge.image_url}
            alt={badge.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <h2 id="badge-modal-title" style={{ margin: '0 0 8px', fontSize: 20 }}>
          {badge.name}
        </h2>
        {badge.description && (
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {badge.description}
          </p>
        )}
        {badge.earned_at && (
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {new Date(badge.earned_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            획득
          </p>
        )}
        <button type="button" className="btn primary" onClick={onClose} style={{ minWidth: 120 }}>
          확인
        </button>
      </div>
    </div>
  )
}
