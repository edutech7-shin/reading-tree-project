import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFiles() {
  const root = process.cwd()
  const candidates = ['.env.local', '.env']

  const parseLine = (line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return null
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) return null
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    return { key, value }
  }

  for (const file of candidates) {
    const fullPath = resolve(root, file)
    if (!existsSync(fullPath)) continue
    try {
      const content = readFileSync(fullPath, 'utf-8')
      content.split(/\r?\n/).forEach((line) => {
        const parsed = parseLine(line)
        if (!parsed) return
        if (process.env[parsed.key] === undefined) {
          process.env[parsed.key] = parsed.value
        }
      })
    } catch (error) {
      console.warn(`[create-notification-test-data] ${file} 로드 중 경고:`, error)
    }
  }
}

loadEnvFiles()

function getEnv(key) {
  const value = process.env[key]
  if (!value) {
    console.error(`[create-notification-test-data] 환경 변수 ${key}가 설정되어 있지 않습니다.`)
    process.exit(1)
  }
  return value
}

// 테스트용 더미 책 데이터
const TEST_BOOKS = [
  { title: '해리포터와 불의 잔', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539167.jpg?type=m1&udate=20141215' },
  { title: '해리포터와 불사조 기사단', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/001/795/00179548.jpg?type=m1&udate=20130523' },
  { title: '해리포터와 혼혈 왕자', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/001/795/00179549.jpg?type=m1&udate=20130523' }
]

const TEST_CONTENTS = [
  '정말 재미있게 읽었어요! 다음 권도 읽고 싶습니다.',
  '주인공의 용기가 인상적이었습니다.',
  '친구와 함께 읽었는데 이야기를 나누는 게 즐거웠어요.',
  '책을 읽고 나서 생각이 많이 바뀌었습니다.',
  '이야기가 너무 재미있어서 밤새 읽었어요.'
]

async function createNotificationTestData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[create-notification-test-data] Supabase URL을 찾을 수 없습니다.')
    process.exit(1)
  }

  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('[create-notification-test-data] 알림 테스트용 더미 데이터 생성을 시작합니다...\n')

  // 학생 계정 가져오기
  const { data: students } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('role', 'student')
    .limit(3)

  if (!students || students.length === 0) {
    console.error('[create-notification-test-data] 학생 계정을 찾을 수 없습니다. 먼저 학생 계정을 생성해주세요.')
    process.exit(1)
  }

  console.log(`[create-notification-test-data] ${students.length}명의 학생을 찾았습니다.\n`)

  // 각 학생마다 승인 대기 중인 기록 1개씩 생성
  const records = []
  for (let i = 0; i < Math.min(3, students.length); i++) {
    const student = students[i]
    const book = TEST_BOOKS[i % TEST_BOOKS.length]
    const content = TEST_CONTENTS[i % TEST_CONTENTS.length]

    records.push({
      user_id: student.id,
      book_title: book.title,
      book_author: book.author,
      book_cover_url: book.coverUrl,
      content_text: content,
      status: 'pending'
    })
  }

  // 기록 삽입
  const { data: insertedRecords, error: insertError } = await supabase
    .from('book_records')
    .insert(records)
    .select('id, user_id, book_title')

  if (insertError) {
    console.error(`[create-notification-test-data] 기록 생성 실패: ${insertError.message}`)
    process.exit(1)
  }

  console.log('[create-notification-test-data] ✅ 승인 대기 중인 기록 생성 완료!\n')
  console.log('생성된 기록:')
  console.log('='.repeat(60))
  
  for (let i = 0; i < insertedRecords.length; i++) {
    const record = insertedRecords[i]
    const student = students.find(s => s.id === record.user_id)
    console.log(`${i + 1}. ${record.book_title}`)
    console.log(`   학생: ${student?.nickname || '알 수 없음'}`)
    console.log(`   기록 ID: ${record.id}`)
    console.log('')
  }

  console.log('='.repeat(60))
  console.log('\n테스트 방법:')
  console.log('1. 교사 계정으로 로그인')
  console.log('2. /teacher/approve 페이지로 이동')
  console.log('3. 위 기록들을 승인하거나 반려하여 알림 생성 테스트')
  console.log('4. 학생 계정으로 로그인하여 /me 페이지에서 알림 확인')
  console.log('\n주의:')
  console.log('- 승인하면 승인 알림 생성')
  console.log('- 반려하면 반려 알림 생성 (반려 사유 입력 가능)')
  console.log('- 승인 시 레벨업 조건 충족 시 레벨업 알림 생성')
  console.log('- 반 나무 레벨업 조건 충족 시 모든 학생에게 레벨업 알림 생성')
}

createNotificationTestData().catch((error) => {
  console.error('[create-notification-test-data] 처리 중 예기치 못한 오류:', error)
  process.exit(1)
})

