import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import styles from '../detail.module.css'

const XP_PER_LEVEL = 100

type PageProps = {
  params: {
    studentId: string
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatPoints(points: number) {
  const formatter = new Intl.NumberFormat('ko-KR')
  const formatted = formatter.format(Math.abs(points))
  return points >= 0 ? `+${formatted}` : `-${formatted}`
}

export const dynamic = 'force-dynamic'

export default async function StudentDetailPage({ params }: PageProps) {
  const { studentId } = params
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'teacher') {
    redirect('/')
  }

  const { data: student, error: studentError } = await supabase
    .from('class_students')
    .select(
      'id, teacher_id, student_number, name, level, leaves, avatar_type, experience, coins, gems'
    )
    .eq('id', studentId)
    .maybeSingle()

  if (studentError || !student || student.teacher_id !== user.id) {
    notFound()
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('class_student_activities')
    .select('id, kind, title, points, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (activitiesError) {
    throw new Error('학생 활동 정보를 불러올 수 없습니다.')
  }

  const xpInLevel = student.experience % XP_PER_LEVEL
  const xpToNext = XP_PER_LEVEL - xpInLevel
  const progress = Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100)

  const activityList = activities ?? []

  return (
    <div className={styles.page}>
      <Link href='/teacher/students' className={styles.backLink}>
        ← 학생 목록으로 돌아가기
      </Link>

      <section className={styles.profileCard}>
        <div className={styles.profileRow}>
          <div className={styles.avatarCircle}>{student.name.slice(0, 1)}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileNameRow}>
              <h1 className={styles.studentName}>{student.name}</h1>
              <div className={styles.tagGroup}>
                <span className={styles.tag}>닉네임설정</span>
                <span className={styles.tag}>칭호변경</span>
              </div>
            </div>
            <p className={styles.profileMeta}>출석번호: {student.student_number}번</p>
            <div className={styles.levelInfo}>
              <span>
                레벨 {student.level}{' '}
                <span style={{ fontWeight: 400 }}>
                  다음 레벨까지 필요한 경험치 {xpToNext}exp
                </span>
              </span>
              <div className={styles.progressBar}>
                <span className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.progressScale}>
                <span>0exp</span>
                <span>{XP_PER_LEVEL}exp</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.statCards}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>보유 골드</span>
            <span className={styles.statValue}>{new Intl.NumberFormat('ko-KR').format(student.coins)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>보유 보석</span>
            <span className={styles.statValue}>{new Intl.NumberFormat('ko-KR').format(student.gems)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>획득 잎사귀</span>
            <span className={styles.statValue}>{student.leaves}</span>
          </div>
        </div>
      </section>

      <nav className={styles.tabBar}>
        <button className={`${styles.tabButton} ${styles.tabButtonActive}`} type='button'>
          정보
        </button>
        <button className={styles.tabButton} type='button'>
          활동 기록
        </button>
        <button className={styles.tabButton} type='button'>
          감정 기록
        </button>
        <button className={styles.tabButton} type='button'>
          상점
        </button>
        <button className={styles.tabButton} type='button'>
          아바타
        </button>
      </nav>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>최근 활동</h2>
          <button className={styles.viewAllButton} type='button'>
            모든 기록 보기
          </button>
        </div>

        {activityList.length === 0 ? (
          <div className={styles.emptyActivities}>
            아직 활동이 없습니다. 학생이 미션을 완료하면 여기에서 확인할 수 있어요.
          </div>
        ) : (
          <div className={styles.activityList}>
            {activityList.map((activity) => {
              const isPositive = activity.points >= 0
              return (
                <div key={activity.id} className={styles.activityItem}>
                  <span className={styles.activityBadge}>
                    {activity.kind === 'mission' ? '미션' : '활동'}
                  </span>
                  <div className={styles.activityContent}>
                    <h3 className={styles.activityTitle}>{activity.title}</h3>
                    <span className={styles.activityMeta}>{formatDate(activity.created_at)}</span>
                  </div>
                  <span
                    className={
                      isPositive ? styles.activityPoints : `${styles.activityPoints} ${styles.activityPointsNegative}`
                    }
                  >
                    {formatPoints(activity.points)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

