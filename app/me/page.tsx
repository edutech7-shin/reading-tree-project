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

  console.error('[MyPage] Profile load error:', profileError)

  const normalizedStatus = (profile?.status ?? '').trim().toLowerCase()
  const normalizedRole = (profile?.role ?? '').trim().toLowerCase()
  console.log('[MyPage] Normalized role/status:', normalizedRole, normalizedStatus)
  
  // status가 null이거나 빈 문자열이면 'active'로 간주 (기존 사용자 호환성)
  const effectiveStatus = normalizedStatus || 'active'

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

  // status가 'pending' 또는 'suspended'인 경우에만 승인 대기 메시지 표시
  // null, 빈 문자열, 'active', 'approved'는 정상 사용 가능
  if (normalizedStatus && !['active', 'approved'].includes(normalizedStatus) && normalizedStatus !== '') {
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

  if (normalizedRole === 'student' && profile?.name) {
    // class_students에서 자신의 teacher_id 찾기
    const { data: classStudent } = await supabase
      .from('class_students')
      .select('teacher_id')
      .eq('name', profile.name)
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

  return (
    <main className="container">
      <h1>내 책장</h1>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 'var(--grid-gap-sm)' }}>내 정보</h3>
        <div>이메일: {user.email}</div>
        <div>이름: {profile.name}</div>
        <div>역할: {normalizedRole === 'admin' ? '관리자' : normalizedRole === 'teacher' ? '교사' : '학생'}</div>
        <div>개인 레벨: {profile.level}</div>
        <div>내 잎사귀: 🍃 {approvedCount ?? 0}개</div>
        <div>내 물방울: 💧 {profile.points}점</div>
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


