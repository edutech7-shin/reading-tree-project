                                                                                                                          import { createSupabaseServerClient } from '../../lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import NextDynamic from 'next/dynamic'
const UserBooksClient = NextDynamic(() => import('../../components/UserBooks'), { ssr: false })

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
  console.log('[MyPage] User ID:', user.id)

  // 프로필 조회 에러가 있으면 로그에 기록
  if (profileError) {
    console.error('[MyPage] Profile load error:', profileError)
    console.error('[MyPage] Profile error code:', profileError.code)
    console.error('[MyPage] Profile error message:', profileError.message)
    console.error('[MyPage] Profile error details:', profileError.details)
  }

  // 프로필이 없거나 조회 실패한 경우 처리
  // RLS 정책 문제일 수 있으므로, 프로필이 없어도 기본값으로 진행
  if (!profile) {
    // 프로필 조회 에러가 있고, 에러 코드가 권한 관련이면 RLS 문제일 가능성
    if (profileError && (profileError.code === 'PGRST301' || profileError.message?.includes('permission') || profileError.message?.includes('policy'))) {
      console.error('[MyPage] RLS policy may be blocking profile access')
      // RLS 문제인 경우에도 기본값으로 진행 (프로필은 존재하지만 조회가 안 되는 경우)
    }
    
    // 프로필이 정말 없는 경우에만 /setup으로 리다이렉트
    // 하지만 프로필은 자동 생성되므로 이 경우는 거의 없음
    // 일단 기본값으로 진행하고, 나중에 필요하면 리다이렉트
    console.warn('[MyPage] Profile not found, using default values')
  }

  const normalizedStatus = (profile?.status ?? '').trim().toLowerCase()
  const normalizedRole = (profile?.role ?? '').trim().toLowerCase()
  console.log('[MyPage] Normalized role/status:', normalizedRole, normalizedStatus)
  
  // status가 null이거나 빈 문자열이면 'active'로 간주 (기존 사용자 호환성)
  // 'active' 또는 'approved'가 아니면 'pending'으로 간주하지 않고 'active'로 처리
  const effectiveStatus = normalizedStatus && ['active', 'approved', 'pending', 'suspended'].includes(normalizedStatus)
    ? normalizedStatus
    : 'active'

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

  // 프로필이 없으면 기본값 사용 (프로필은 자동 생성되므로 이 경우는 거의 없음)
  // 실제로 프로필이 없는 경우에만 /setup으로 리다이렉트
  // 하지만 RLS 문제로 조회가 안 되는 경우도 있으므로, 일단 기본값으로 진행
  const profileName = profile?.name || user.email?.split('@')[0] || '사용자'
  const profileRole = normalizedRole || 'student'
  const profileLevel = profile?.level || 1
  const profilePoints = profile?.points || 0

  if (profileRole === 'admin') {
    redirect('/admin/dashboard')
  }

  // status가 'pending' 또는 'suspended'인 경우에만 승인 대기 메시지 표시
  // null, 빈 문자열, 'active', 'approved'는 정상 사용 가능
  if (effectiveStatus === 'pending' || effectiveStatus === 'suspended') {
    return (
      <main className="container">
        <h1>내 책장</h1>
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

  // 우리 반 정보 가져오기 (학생인 경우)
  let classInfo: {
    className: string | null
    classLevel: number
    classLeaves: number
    classTarget: number
    classmateCount: number
  } | null = null

  if (profileRole === 'student' && profileName) {
    // class_students에서 자신의 teacher_id 찾기
    const { data: classStudent } = await supabase
      .from('class_students')
      .select('teacher_id')
      .eq('name', profileName)
      .limit(1)
      .maybeSingle()

    if (classStudent?.teacher_id) {
      // 반 나무 정보 가져오기
      const { data: classTree } = await supabase
        .from('class_trees')
        .select('class_name, current_level, current_leaves, level_up_target')
        .limit(1)
        .maybeSingle()

      // 같은 반 친구 수 세기
      const { count: classmateCount } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', classStudent.teacher_id)

      classInfo = {
        className: classTree?.class_name || null,
        classLevel: classTree?.current_level ?? 1,
        classLeaves: classTree?.current_leaves ?? 0,
        classTarget: classTree?.level_up_target ?? 50,
        classmateCount: classmateCount ?? 0
      }
    }
  }

  // 어린이 인기 도서 가져오기 (최대 5권)
  const { data: popularBooks } = await supabase
    .from('popular_children_books')
    .select('*')
    .order('display_order', { ascending: true })
    .limit(5)

  // 선생님 추천 도서 가져오기 (최대 5권)
  // 현재 사용자의 teacher_id를 찾아서 해당 교사의 추천 도서 가져오기
  let recommendedBooks: any[] = []
  if (profileRole === 'student' && profileName) {
    // class_students에서 teacher_id 찾기
    const { data: classStudent } = await supabase
      .from('class_students')
      .select('teacher_id')
      .eq('name', profileName)
      .limit(1)
      .maybeSingle()

    if (classStudent?.teacher_id) {
      const { data: teacherBooks } = await supabase
        .from('teacher_recommended_books')
        .select('*')
        .eq('teacher_id', classStudent.teacher_id)
        .order('display_order', { ascending: true })
        .limit(5)
      
      recommendedBooks = teacherBooks || []
    }
  }

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

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <main className="container">
      <h1>내 책장</h1>
      
      {/* 독서 습관 기르기 섹션 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-md)' }}>📚 독서 습관 기르기</h2>
        
        {/* 어린이 인기 도서 */}
        {popularBooks && popularBooks.length > 0 && (
          <div style={{ marginBottom: 'var(--grid-gap-lg)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-lg)' }}>
              ⭐ 어린이 인기 도서
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 'var(--grid-gap-sm)'
            }}>
              {popularBooks.map((book) => (
                <div
                  key={book.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 'var(--grid-gap-xs)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-small)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    textAlign: 'center'
                  }}
                >
                  {book.book_cover_url ? (
                    <img
                      src={book.book_cover_url}
                      alt={book.book_title || ''}
                      style={{
                        width: '100%',
                        aspectRatio: '3/4',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-small)',
                        marginBottom: 'var(--grid-gap-xs)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      aspectRatio: '3/4',
                      backgroundColor: 'var(--color-border-light)',
                      borderRadius: 'var(--radius-small)',
                      marginBottom: 'var(--grid-gap-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      표지 없음
                    </div>
                  )}
                  <div style={{ width: '100%' }}>
                    <div style={{ 
                      fontWeight: 'var(--font-weight-semibold)', 
                      fontSize: 'var(--font-size-xs)',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4
                    }}>
                      {book.book_title || '(제목 없음)'}
                    </div>
                    {book.book_author && (
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {book.book_author}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 선생님 추천 도서 */}
        {recommendedBooks.length > 0 && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)', fontSize: 'var(--font-size-lg)' }}>
              👨‍🏫 선생님 추천 도서
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 'var(--grid-gap-sm)'
            }}>
              {recommendedBooks.map((book) => (
                <div
                  key={book.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 'var(--grid-gap-xs)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-small)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    textAlign: 'center'
                  }}
                >
                  {book.book_cover_url ? (
                    <img
                      src={book.book_cover_url}
                      alt={book.book_title || ''}
                      style={{
                        width: '100%',
                        aspectRatio: '3/4',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-small)',
                        marginBottom: 'var(--grid-gap-xs)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      aspectRatio: '3/4',
                      backgroundColor: 'var(--color-border-light)',
                      borderRadius: 'var(--radius-small)',
                      marginBottom: 'var(--grid-gap-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      표지 없음
                    </div>
                  )}
                  <div style={{ width: '100%' }}>
                    <div style={{ 
                      fontWeight: 'var(--font-weight-semibold)', 
                      fontSize: 'var(--font-size-xs)',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4
                    }}>
                      {book.book_title || '(제목 없음)'}
                    </div>
                    {book.book_author && (
                      <div style={{ 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {book.book_author}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!popularBooks || popularBooks.length === 0) && recommendedBooks.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: 24, fontSize: 14 }}>
            추천 도서가 없습니다.
          </p>
        )}
      </div>
      
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
              <div
                key={notification.id}
                style={{
                  padding: 12,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  backgroundColor: notification.is_read ? '#f9f9f9' : '#fff',
                  opacity: notification.is_read ? 0.7 : 1
                }}
              >
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
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: 12, fontSize: 14 }}>
            알림이 없습니다.
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>내 정보</h3>
        <div>이메일: {user.email}</div>
        <div>이름: {profileName}</div>
        <div>역할: {profileRole === 'admin' ? '관리자' : profileRole === 'teacher' ? '교사' : '학생'}</div>
        <div>개인 레벨: {profileLevel}</div>
        <div>내 잎사귀: 🍃 {approvedCount ?? 0}개</div>
        <div>내 물방울: 💧 {profilePoints}점</div>
      </div>

      {/* 우리 반 정보 (학생인 경우만 표시) */}
      {classInfo && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>우리 반</h3>
          {classInfo.className && (
            <div>반 이름: {classInfo.className}</div>
          )}
          <div>반 나무 레벨: 🌳 Lv.{classInfo.classLevel}</div>
          <div>반 나무 잎사귀: 🍃 {classInfo.classLeaves} / {classInfo.classTarget}개</div>
          <div>반 친구 수: 👥 {classInfo.classmateCount}명</div>
        </div>
      )}

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


