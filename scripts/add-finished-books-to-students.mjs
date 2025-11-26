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
        if (parsed) {
          if (process.env[parsed.key] === undefined) {
            process.env[parsed.key] = parsed.value
          }
        }
      })
    } catch (error) {
      console.warn(`[add-finished-books] ${file} 로드 중 경고:`, error)
    }
  }
}

loadEnvFiles()

function getEnv(key) {
  const value = process.env[key]
  if (!value) {
    console.error(`[add-finished-books] 환경 변수 ${key}가 설정되어 있지 않습니다.`)
    process.exit(1)
  }
  return value
}

// 테스트용 책 데이터
const TEST_BOOKS = [
  { title: '해리포터와 마법사의 돌', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539163.jpg?type=m1&udate=20141215', publisher: '문학수첩', publicationYear: '1997', totalPages: 320 },
  { title: '해리포터와 비밀의 방', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539165.jpg?type=m1&udate=20141215', publisher: '문학수첩', publicationYear: '1998', totalPages: 352 },
  { title: '해리포터와 아즈카반의 죄수', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/001/795/00179546.jpg?type=m1&udate=20130523', publisher: '문학수첩', publicationYear: '1999', totalPages: 448 },
  { title: '작은 아씨들', author: '루이자 메이 올컷', coverUrl: null, publisher: '문학동네', publicationYear: '1868', totalPages: 528 },
  { title: '톰 소여의 모험', author: '마크 트웨인', coverUrl: null, publisher: '민음사', publicationYear: '1876', totalPages: 256 },
  { title: '헤클베리 핀의 모험', author: '마크 트웨인', coverUrl: null, publisher: '민음사', publicationYear: '1884', totalPages: 320 },
  { title: '세금 내는 아이들', author: '옥효진', coverUrl: null, publisher: '한빛미디어', publicationYear: '2017', totalPages: 224 },
  { title: '사피엔스', author: '유발 하라리', coverUrl: null, publisher: '김영사', publicationYear: '2011', totalPages: 672 }
]

async function addFinishedBooksToStudents() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[add-finished-books] Supabase URL을 찾을 수 없습니다.')
    process.exit(1)
  }

  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('[add-finished-books] 모든 학생에게 다 읽은 책을 추가합니다...\n')

  // 모든 학생 가져오기
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'student')

  if (studentsError) {
    console.error(`[add-finished-books] 학생 목록 조회 실패: ${studentsError.message}`)
    process.exit(1)
  }

  if (!students || students.length === 0) {
    console.error('[add-finished-books] 학생을 찾을 수 없습니다.')
    process.exit(1)
  }

  console.log(`[add-finished-books] ${students.length}명의 학생을 찾았습니다.\n`)

  // 각 학생에게 책 추가
  let totalAdded = 0
  for (const student of students) {
    console.log(`[add-finished-books] ${student.name} 학생에게 책 추가 중...`)

    // 각 학생에게 3-5권의 랜덤한 책 추가
    const booksToAdd = []
    const numBooks = Math.floor(Math.random() * 3) + 3 // 3-5권
    const shuffledBooks = [...TEST_BOOKS].sort(() => Math.random() - 0.5)

    for (let i = 0; i < numBooks && i < shuffledBooks.length; i++) {
      const book = shuffledBooks[i]
      booksToAdd.push({
        user_id: student.id,
        book_title: book.title,
        book_author: book.author,
        book_cover_url: book.coverUrl,
        book_publisher: book.publisher,
        book_publication_year: book.publicationYear,
        book_total_pages: book.totalPages,
        status: 'finished',
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() // 최근 30일 내 랜덤 날짜
      })
    }

    const { data: insertedBooks, error: insertError } = await supabase
      .from('user_books')
      .insert(booksToAdd)
      .select('id, book_title')

    if (insertError) {
      console.error(`  ❌ 책 추가 실패: ${insertError.message}`)
      continue
    }

    totalAdded += insertedBooks.length
    console.log(`  ✅ ${insertedBooks.length}권 추가 완료`)
    insertedBooks.forEach((book, index) => {
      console.log(`     ${index + 1}. ${book.book_title}`)
    })
    console.log('')
  }

  console.log('='.repeat(60))
  console.log(`[add-finished-books] 완료! 총 ${totalAdded}권의 책이 추가되었습니다.`)
  console.log('='.repeat(60))
}

addFinishedBooksToStudents().catch((error) => {
  console.error('[add-finished-books] 오류 발생:', error)
  process.exit(1)
})

