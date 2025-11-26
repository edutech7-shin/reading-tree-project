'use client'

import Link from 'next/link'

type NotificationItemProps = {
  notification: {
    id: number
    title: string
    message: string
    is_read: boolean
    created_at: string
  }
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const isMissionNotification = notification.title === '📚 오늘의 미션'
  
  const baseStyle: React.CSSProperties = {
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 8,
    backgroundColor: notification.is_read ? '#f9f9f9' : '#fff',
    opacity: notification.is_read ? 0.7 : 1,
    cursor: isMissionNotification ? 'pointer' : 'default',
    transition: 'all 0.2s',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block'
  }

  const content = (
    <>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {notification.title}
      </div>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
        {notification.message}
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>
        {new Date(notification.created_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      {isMissionNotification && (
        <div style={{ fontSize: 12, color: '#0070f3', marginTop: 4 }}>
          클릭하여 미션 페이지로 이동 →
        </div>
      )}
    </>
  )

  if (isMissionNotification) {
    return (
      <Link href="/missions" style={baseStyle}>
        {content}
      </Link>
    )
  }

  return (
    <div style={baseStyle}>
      {content}
    </div>
  )
}

