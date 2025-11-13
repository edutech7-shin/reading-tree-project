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
      console.warn(`[create-test-data] ${file} 로드 중 경고:`, error)
    }
  }
}

loadEnvFiles()

function getEnv(key) {
  const value = process.env[key]
  if (!value) {
    console.error(`[create-test-data] 환경 변수 ${key}가 설정되어 있지 않습니다.`)
    process.exit(1)
  }
  return value
}

// 테스트용 더미 책 데이터
const TEST_BOOKS = [
  { title: '해리포터와 죽음의 성물', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/001/795/00179550.jpg?type=m1&udate=20130523' },
  { title: '마법사의 돌', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539163.jpg?type=m1&udate=20141215' }
]

const TEST_CONTENTS = [
  '정말 재미있게 읽었어요! 마지막 권이라서 아쉬웠지만 너무 좋았습니다.',
  '주인공들이 모두 성장하는 모습이 인상적이었어요. 추천하고 싶은 책입니다!'
]

async function createTestDataForKim() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[create-test-data] Supabase URL을 찾을 수 없습니다.')
    process.exit(1)
  }

  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('[create-test-data] 김철수 학생을 위한 테스트 데이터 생성을 시작합니다...\n')

  // 김철수 학생 찾기
  const { data: students } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'student')
    .eq('name', '김철수')
    .limit(1)

  if (!students || students.length === 0) {
    console.error('[create-test-data] 김철수 학생을 찾을 수 없습니다.')
    process.exit(1)
  }

  const student = students[0]
  console.log(`[create-test-data] 학생 발견: ${student.name} (${student.id})\n`)

  // 김철수 학생에게 승인 대기 중인 기록 2개 생성
  const records = TEST_BOOKS.map((book, index) => ({
    user_id: student.id,
    book_title: book.title,
    book_author: book.author,
    book_cover_url: book.coverUrl,
    content_text: TEST_CONTENTS[index],
    status: 'pending'
  }))

  // 기록 삽입
  const { data: insertedRecords, error: insertError } = await supabase
    .from('book_records')
    .insert(records)
    .select('id, user_id, book_title')

  if (insertError) {
    console.error(`[create-test-data] 기록 생성 실패: ${insertError.message}`)
    process.exit(1)
  }

  console.log('[create-test-data] ✅ 승인 대기 중인 기록 생성 완료!\n')
  console.log('생성된 기록:')
  console.log('='.repeat(60))
  
  insertedRecords.forEach((record, index) => {
    console.log(`${index + 1}. ${record.book_title}`)
    console.log(`   학생: ${student.name}`)
    console.log(`   기록 ID: ${record.id}`)
    console.log(`   상태: 승인 대기`)
    console.log('')
  })

  console.log('='.repeat(60))
  console.log('\n테스트 방법:')
  console.log('1. 교사 계정으로 로그인')
  console.log('2. /teacher/approve 페이지로 이동')
  console.log('3. 위 기록들을 승인하거나 반려하여 알림 생성 테스트')
  console.log('4. 김철수 학생 계정(student1@test.com / test1234)으로 로그인하여 /me 페이지에서 알림 확인')
}

createTestDataForKim().catch((error) => {
  console.error('[create-test-data] 처리 중 예기치 못한 오류:', error)
  process.exit(1)
})

