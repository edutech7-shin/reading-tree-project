                                                                                                                          import { createSupabaseServerClient } from '../../lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import NextDynamic from 'next/dynamic'
const UserBooksClient = NextDynamic(() => import('../../components/UserBooks'), { ssr: false })
const NotificationItem = NextDynamic(() => import('../../components/NotificationItem'), { ssr: false })

export const dynamic = 'force-dynamic'

export default async function MyPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="container">
        <h1>내 책장</h1>
        <p>로그인이 필요합니다. 상단의 로그인 메뉴를 이용해주세요.</p>
      </main>
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, role, level, points, status')
    .eq('id', user.id)
    .maybeSingle()

  console.log('[MyPage] Raw profile:', profile)
  console.log('[MyPage] Profile error:', profileError)

  console.error('[MyPage] Profile load error:', profileError)

  const normalizedStatus = (profile?.status ?? '').trim().toLowerCase()
  const normalizedRole = (profile?.role ?? '').trim().toLowerCase()
  console.log('[MyPage] Normalized role/status:', normalizedRole, normalizedStatus)

  const { count: approvedCount } = await supabase
    .from('book_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved')

  // 내 독서 기록 목록 가져오기
  const { data: readingRecords } = await supabase
    .from('book_records')
    .select('id, book_title, book_author, book_cover_url, content_text, status, teacher_comment, created_at, rating')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // 알림 가져오기
  const { data: notifications, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, type, title, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  
  // 알림 로딩 에러가 있어도 계속 진행 (알림이 없을 수도 있음)
  if (notificationsError) {
    console.error('[MyPage] Notifications load error:', notificationsError)
  }

  // 프로필이 없으면 설정 페이지로 리다이렉트
  if (!profile) {
    return (
      <main className="container">
        <h1>내 책장</h1>
        <div className="card">
          <p>이메일: {user.email}</p>
          <p style={{ color: '#f97316', marginTop: 12 }}>
            ⚠️ 관리자 승인 대기 중입니다.
          </p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            관리자가 가입을 승인하면 Reading Tree를 사용할 수 있습니다. 승인 완료 시 안내 메일을 전송할 예정입니다.
          </p>
          <a href="/setup" className="btn primary" style={{ marginTop: 16, display: 'inline-block' }}>
            승인 안내 보기
          </a>
        </div>
      </main>
    )
  }

  if (normalizedRole === 'admin') {
    redirect('/admin/dashboard')
  }

  if (normalizedStatus && !['active', 'approved'].includes(normalizedStatus)) {
    return (
      <main className="container">
        <h1>내 나무</h1>
        <div className="card">
          <p>이메일: {user.email}</p>
          <p style={{ color: '#f97316', marginTop: 12 }}>
            ⚠️ 관리자 승인 대기 중입니다.
          </p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            관리자 승인 이후 서비스 사용이 가능합니다. 승인이 완료되면 이메일로 알려드릴게요.
          </p>
        </div>
      </main>
    )
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <main className="container">
      <h1>책장</h1>
      
      {/* 알림 섹션 - 알림이 있거나 없어도 항상 표시 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>알림</h3>
          {unreadCount > 0 && (
            <span style={{ 
              backgroundColor: '#dc3545', 
              color: 'white', 
              borderRadius: '12px', 
              padding: '2px 8px', 
              fontSize: 12,
              fontWeight: 600
            }}>
              {unreadCount}개
            </span>
          )}
        </div>
        {notifications && notifications.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: 12, fontSize: 14 }}>
            알림이 없습니다.
          </p>
        )}
      </div>

      <div className="card">
        <div>이메일: {user.email}</div>
        <div>이름: {profile.name}</div>
        <div>역할: {normalizedRole === 'admin' ? '관리자' : normalizedRole === 'teacher' ? '교사' : '학생'}</div>
        <div>개인 레벨: {profile.level}</div>
        <div>내 잎사귀: 🍃 {approvedCount ?? 0}개</div>
        <div>내 물방울: 💧 {profile.points}점</div>
      </div>

      {/** 책장 (읽고 있어요 / 다 읽었어요) */}
      {/* Client 컴포넌트를 동적 import하여 CSR로 렌더링 */}
      <UserBooksClient />

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>내 독서 기록</h3>
        {readingRecords && readingRecords.length > 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {readingRecords.map((record) => (
              <div
                key={record.id}
                style={{
                  padding: 12,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                {record.book_cover_url && (
                  <img
                    src={record.book_cover_url}
                    alt={record.book_title || ''}
                    style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 4 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {record.book_title || '(제목 없음)'}
                    {record.book_author && <small style={{ color: '#666', marginLeft: 8 }}>{record.book_author}</small>}
                  </div>
                  {record.rating && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4,
                      fontSize: 14,
                      marginTop: 4
                    }}>
                      <span style={{ color: '#666' }}>별점:</span>
                      <span style={{ color: '#FFD700' }}>
                        {'★'.repeat(record.rating)}
                      </span>
                    </div>
                  )}
                  {record.content_text && (
                    <p style={{ fontSize: 14, color: '#555', marginTop: 4, marginBottom: 0 }}>
                      {record.content_text.length > 100
                        ? `${record.content_text.substring(0, 100)}...`
                        : record.content_text}
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {new Date(record.created_at).toLocaleDateString('ko-KR')} ·{' '}
                    {record.status === 'approved' && '✅ 승인됨'}
                    {record.status === 'pending' && '⏳ 승인 대기'}
                    {record.status === 'rejected' && '❌ 반려됨'}
                  </div>
                  {record.status === 'rejected' && record.teacher_comment && (
                    <div style={{ 
                      marginTop: 8, 
                      padding: 8, 
                      backgroundColor: '#fff3cd', 
                      border: '1px solid #ffc107',
                      borderRadius: 4,
                      fontSize: 13,
                      color: '#856404'
                    }}>
                      <strong>반려 사유:</strong> {record.teacher_comment}
                    </div>
                  )}
                  {record.status === 'approved' && record.teacher_comment && (
                    <div style={{ 
                      marginTop: 8, 
                      padding: 8, 
                      backgroundColor: '#d4edda', 
                      border: '1px solid #28a745',
                      borderRadius: 4,
                      fontSize: 13,
                      color: '#155724'
                    }}>
                      <strong>교사 코멘트:</strong> {record.teacher_comment}
                    </div>
                  )}
                  {/* 수정 버튼 - 승인 대기 중이거나 반려된 기록만 */}
                  {(record.status === 'pending' || record.status === 'rejected') && (
                    <div style={{ marginTop: 8 }}>
                      <Link 
                        href={`/record/edit/${record.id}`}
                        className="btn"
                        style={{ fontSize: 13, padding: '6px 12px' }}
                      >
                        ✏️ 수정하기
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: 24 }}>
            아직 기록한 독서가 없습니다.
            <br />
            <Link href="/record" style={{ color: '#0070f3', textDecoration: 'underline', marginTop: 8, display: 'inline-block' }}>
              첫 독서록 →
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}


