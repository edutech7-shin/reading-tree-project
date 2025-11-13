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

// 테스트용 학생 데이터
const STUDENTS = [
  { email: 'student1@test.com', password: 'test1234', name: '김철수' },
  { email: 'student2@test.com', password: 'test1234', name: '이영희' },
  { email: 'student3@test.com', password: 'test1234', name: '박민수' },
  { email: 'student4@test.com', password: 'test1234', name: '최지은' },
  { email: 'student5@test.com', password: 'test1234', name: '정준호' }
]

// 더미 독서 기록 데이터
const DUMMY_BOOKS = [
  { title: '해리포터와 마법사의 돌', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539163.jpg?type=m1&udate=20141215' },
  { title: '해리포터와 비밀의 방', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/085/391/08539165.jpg?type=m1&udate=20141215' },
  { title: '해리포터와 아즈카반의 죄수', author: 'J.K. 롤링', coverUrl: 'https://bookthumb-phinf.pstatic.net/cover/001/795/00179546.jpg?type=m1&udate=20130523' },
  { title: '세금 내는 아이들', author: '옥효진', coverUrl: null },
  { title: '사피엔스', author: '유발 하라리', coverUrl: null },
  { title: '작은 아씨들', author: '루이자 메이 올컷', coverUrl: null },
  { title: '톰 소여의 모험', author: '마크 트웨인', coverUrl: null },
  { title: '헤클베리 핀의 모험', author: '마크 트웨인', coverUrl: null }
]

const DUMMY_CONTENTS = [
  '정말 재미있게 읽었어요! 다음 권도 읽고 싶습니다.',
  '주인공의 용기가 인상적이었습니다.',
  '친구와 함께 읽었는데 이야기를 나누는 게 즐거웠어요.',
  '책을 읽고 나서 생각이 많이 바뀌었습니다.',
  '이야기가 너무 재미있어서 밤새 읽었어요.',
  '마지막 부분이 너무 슬펐습니다.',
  '다음 권을 기대하고 있어요!',
  '책을 읽으며 많은 것을 배웠습니다.',
  '주인공이 정말 멋있었어요.',
  '이 책을 추천하고 싶어요!'
]

async function createTestData() {
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

  console.log('[create-test-data] 테스트 데이터 생성을 시작합니다...\n')

  // 학생 계정 생성
  const createdStudents = []
  for (const student of STUDENTS) {
    console.log(`[create-test-data] ${student.name} (${student.email}) 계정 생성 중...`)
    
    // 기존 계정 확인
    const { data: listData } = await supabase.auth.admin.listUsers({
      email: student.email
    })
    
    let user = listData?.users?.find(u => u.email?.toLowerCase() === student.email.toLowerCase())
    
    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: student.email,
        password: student.password,
        email_confirm: true,
        user_metadata: {
          name: student.name,
          role: 'student'
        }
      })
      
      if (error) {
        console.error(`  ❌ 계정 생성 실패: ${error.message}`)
        continue
      }
      
      user = data.user
      console.log(`  ✅ 계정 생성 완료: ${user.id}`)
    } else {
      console.log(`  ⚠️ 기존 계정 발견: ${user.id} (비밀번호 업데이트)`)
      await supabase.auth.admin.updateUserById(user.id, {
        password: student.password,
        email_confirm: true
      })
    }

    // 프로필 업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: student.name,
        role: 'student',
        level: 1,
        points: 0
      }, { onConflict: 'id' })

    if (profileError) {
      console.error(`  ❌ 프로필 생성 실패: ${profileError.message}`)
      continue
    }

    createdStudents.push({ ...student, userId: user.id })
  }

  console.log(`\n[create-test-data] ${createdStudents.length}명의 학생 계정 생성 완료\n`)

  // 더미 독서 기록 생성
  console.log('[create-test-data] 더미 독서 기록 생성 중...\n')

  // 각 학생마다 다양한 상태의 기록 생성
  let recordCount = 0
  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i]
    const records = []

    // 승인된 기록 2-4개 (잎사귀 카운트에 포함)
    const approvedCount = 2 + Math.floor(Math.random() * 3)
    for (let j = 0; j < approvedCount; j++) {
      const book = DUMMY_BOOKS[Math.floor(Math.random() * DUMMY_BOOKS.length)]
      const content = DUMMY_CONTENTS[Math.floor(Math.random() * DUMMY_CONTENTS.length)]
      const daysAgo = Math.floor(Math.random() * 30) // 최근 30일 내
      
      records.push({
        user_id: student.userId,
        book_title: book.title,
        book_author: book.author,
        book_cover_url: book.coverUrl,
        content_text: content,
        status: 'approved',
        teacher_comment: j === 0 ? '잘 읽었네요! 👍' : null,
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    // 승인 대기 기록 1-2개
    const pendingCount = 1 + Math.floor(Math.random() * 2)
    for (let j = 0; j < pendingCount; j++) {
      const book = DUMMY_BOOKS[Math.floor(Math.random() * DUMMY_BOOKS.length)]
      const content = DUMMY_CONTENTS[Math.floor(Math.random() * DUMMY_CONTENTS.length)]
      const daysAgo = Math.floor(Math.random() * 7) // 최근 7일 내
      
      records.push({
        user_id: student.userId,
        book_title: book.title,
        book_author: book.author,
        book_cover_url: book.coverUrl,
        content_text: content,
        status: 'pending',
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    // 반려된 기록 0-1개
    const rejectedCount = Math.floor(Math.random() * 2)
    for (let j = 0; j < rejectedCount; j++) {
      const book = DUMMY_BOOKS[Math.floor(Math.random() * DUMMY_BOOKS.length)]
      const content = DUMMY_CONTENTS[Math.floor(Math.random() * DUMMY_CONTENTS.length)]
      const daysAgo = 7 + Math.floor(Math.random() * 10) // 7-17일 전
      
      records.push({
        user_id: student.userId,
        book_title: book.title,
        book_author: book.author,
        book_cover_url: book.coverUrl,
        content_text: content,
        status: 'rejected',
        teacher_comment: '내용을 더 자세히 작성해주세요.',
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    // 기록 삽입
    const { error: insertError } = await supabase
      .from('book_records')
      .insert(records)

    if (insertError) {
      console.error(`  ❌ ${student.name}의 기록 생성 실패: ${insertError.message}`)
    } else {
      console.log(`  ✅ ${student.name}: ${records.length}개 기록 생성`)
      console.log(`     - 승인됨: ${approvedCount}개`)
      console.log(`     - 승인 대기: ${pendingCount}개`)
      console.log(`     - 반려됨: ${rejectedCount}개`)
      recordCount += records.length
    }
  }

  // 프로필 포인트 업데이트 (승인된 기록당 +10 포인트)
  console.log('\n[create-test-data] 학생 포인트 업데이트 중...')
  for (const student of createdStudents) {
    const { count } = await supabase
      .from('book_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', student.userId)
      .eq('status', 'approved')

    const points = (count ?? 0) * 10
    
    await supabase
      .from('profiles')
      .update({ points })
      .eq('id', student.userId)

    console.log(`  ✅ ${student.name}: ${points}점 (승인 기록 ${count ?? 0}개)`)
  }

  // 반 나무 초기화 (없으면 생성)
  console.log('\n[create-test-data] 반 나무 초기화 중...')
  const { data: existingTree } = await supabase
    .from('class_trees')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!existingTree) {
    const { count: totalLeaves } = await supabase
      .from('book_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
    
    const { error: treeError } = await supabase
      .from('class_trees')
      .insert({
        class_name: '테스트 반',
        current_level: 1,
        current_leaves: totalLeaves,
        level_up_target: 50
      })

    if (treeError) {
      console.error(`  ❌ 반 나무 생성 실패: ${treeError.message}`)
    } else {
      console.log(`  ✅ 반 나무 생성 완료 (현재 잎사귀: ${totalLeaves}개)`)
    }
  } else {
    // 기존 나무의 잎사귀 수 업데이트
    const { count: totalLeaves } = await supabase
      .from('book_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
    
    await supabase
      .from('class_trees')
      .update({ current_leaves: totalLeaves })
      .eq('id', existingTree.id)

    console.log(`  ✅ 반 나무 업데이트 완료 (현재 잎사귀: ${totalLeaves}개)`)
  }

  console.log('\n[create-test-data] 테스트 데이터 생성 완료!')
  console.log('\n생성된 계정 정보:')
  console.log('='.repeat(50))
  STUDENTS.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}`)
    console.log(`   이메일: ${s.email}`)
    console.log(`   비밀번호: ${s.password}`)
    console.log('')
  })
  console.log('='.repeat(50))
  console.log(`\n총 ${recordCount}개의 독서 기록이 생성되었습니다.`)
}

createTestData().catch((error) => {
  console.error('[create-test-data] 처리 중 예기치 못한 오류:', error)
  process.exit(1)
})

