import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../../lib/supabase/server'
import styles from './dashboard.module.css'

type TeacherProfile = {
  id: string
  name: string | null
  username: string | null
  created_at: string
}

type ClassStudent = {
  id: string
  teacher_id: string
  student_number: number
  name: string
  level: number
  leaves: number
  coins: number
  gems: number
  created_at: string
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || adminProfile?.role !== 'admin') {
    redirect('/')
  }

  const [
    { data: teacherRows, error: teacherError },
    { data: studentRows, error: studentError }
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, username, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })
      .returns<TeacherProfile[]>(),
    supabase
      .from('class_students')
      .select('id, teacher_id, student_number, name, level, leaves, coins, gems, created_at')
      .order('created_at', { ascending: false })
      .returns<ClassStudent[]>()
  ])

  if (teacherError) {
    throw new Error('교사 목록을 불러올 수 없습니다.')
  }

  if (studentError) {
    throw new Error('학생 목록을 불러올 수 없습니다.')
  }

  const teachers = teacherRows ?? []
  const students = studentRows ?? []

  const studentCountByTeacher = students.reduce<Record<string, number>>((acc, student) => {
    acc[student.teacher_id] = (acc[student.teacher_id] ?? 0) + 1
    return acc
  }, {})

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const newTeachersThisWeek = teachers.filter(
    (teacher) => new Date(teacher.created_at) >= oneWeekAgo
  ).length
  const newStudentsThisWeek = students.filter(
    (student) => new Date(student.created_at) >= oneWeekAgo
  ).length

  const totalCoins = students.reduce((sum, student) => sum + (student.coins ?? 0), 0)
  const totalGems = students.reduce((sum, student) => sum + (student.gems ?? 0), 0)

  const recentStudents = students.slice(0, 20)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>시스템 관리자 대시보드</h1>
        <p className={styles.subtitle}>
          전체 교사와 학생 현황을 한눈에 파악하고 관리합니다.
        </p>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>전체 교사 수</span>
          <span className={styles.summaryValue}>{numberFormatter.format(teachers.length)}</span>
          <span className={styles.summaryDelta}>
            지난 7일 신규 {numberFormatter.format(newTeachersThisWeek)}명
          </span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>전체 학생 수</span>
          <span className={styles.summaryValue}>{numberFormatter.format(students.length)}</span>
          <span className={styles.summaryDelta}>
            지난 7일 신규 {numberFormatter.format(newStudentsThisWeek)}명
          </span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>학생 총 보유 골드</span>
          <span className={styles.summaryValue}>{numberFormatter.format(totalCoins)}</span>
          <span className={styles.summaryDelta}>평균 {numberFormatter.format(Math.round(students.length ? totalCoins / students.length : 0))} 골드</span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>학생 총 보유 보석</span>
          <span className={styles.summaryValue}>{numberFormatter.format(totalGems)}</span>
          <span className={styles.summaryDelta}>평균 {numberFormatter.format(Math.round(students.length ? totalGems / students.length : 0))} 보석</span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>교사 목록</h2>
            <p className={styles.sectionHint}>
              최근 가입 순으로 정렬되어 있습니다.
            </p>
          </div>

          {teachers.length === 0 ? (
            <div className={styles.emptyState}>아직 등록된 교사가 없습니다.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>닉네임</th>
                    <th>계정</th>
                    <th>학생 수</th>
                    <th>가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>{teacher.name ?? '이름 없음'}</td>
                      <td>
                        <span className={styles.tag}>
                          {teacher.username ?? '아이디 없음'}
                        </span>
                      </td>
                      <td>{numberFormatter.format(studentCountByTeacher[teacher.id] ?? 0)}</td>
                      <td>{formatDate(teacher.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최근 학생 등록</h2>
            <p className={styles.sectionHint}>
              가장 최근에 추가된 학생 20명을 표시합니다.
            </p>
          </div>

          {recentStudents.length === 0 ? (
            <div className={styles.emptyState}>아직 등록된 학생이 없습니다.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>학생 정보</th>
                    <th>담당 교사</th>
                    <th>레벨</th>
                    <th>골드 / 보석</th>
                    <th>등록일</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((student) => {
                    const teacher = teachers.find((item) => item.id === student.teacher_id)
                    return (
                      <tr key={student.id}>
                        <td>
                          <div className={styles.studentRow}>
                            <span className={styles.studentName}>
                              {student.name} ({student.student_number}번)
                            </span>
                            <span className={styles.studentMeta}>
                              잎사귀 {numberFormatter.format(student.leaves)}개
                            </span>
                          </div>
                        </td>
                        <td>{teacher?.name ?? '미배정'}</td>
                        <td>Lv.{student.level}</td>
                        <td>
                          {numberFormatter.format(student.coins)} /{' '}
                          {numberFormatter.format(student.gems)}
                        </td>
                        <td>{formatDateTime(student.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

