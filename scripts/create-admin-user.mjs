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
      console.warn(`[create-admin-user] ${file} 로드 중 경고:`, error)
    }
  }
}

loadEnvFiles()

const ADMIN_EMAIL = 'edutech7@pajuwaseok.es.kr'
const TEMP_PASSWORD = 'qwer1234'

function getEnv(key) {
  const value = process.env[key]
  if (!value) {
    console.error(`[create-admin-user] 환경 변수 ${key}가 설정되어 있지 않습니다.`)
    process.exit(1)
  }
  return value
}

async function ensureAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[create-admin-user] Supabase URL을 찾을 수 없습니다. NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL을 설정하세요.')
    process.exit(1)
  }

  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`[create-admin-user] ${ADMIN_EMAIL} 계정 생성(또는 갱신)을 시작합니다.`)

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    email: ADMIN_EMAIL
  })

  if (listError) {
    console.error('[create-admin-user] 사용자 조회 중 오류:', listError)
    process.exit(1)
  }

  let user = listData?.users?.find((candidate) => candidate.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())

  if (!user) {
    console.log('[create-admin-user] 기존 계정이 없어 새 계정을 생성합니다.')
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: '관리자',
        role: 'admin'
      }
    })

    if (error) {
      console.error('[create-admin-user] 계정 생성 실패:', error)
      process.exit(1)
    }
    user = data.user ?? null
  } else {
    console.log('[create-admin-user] 기존 계정을 찾았습니다. 비밀번호와 메타데이터를 갱신합니다.')
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata || {}),
        name: '관리자',
        role: 'admin'
      }
    })
    if (error) {
      console.error('[create-admin-user] 계정 갱신 실패:', error)
      process.exit(1)
    }
    user = data.user ?? user
  }

  if (!user) {
    console.error('[create-admin-user] 사용자 정보를 가져오지 못했습니다.')
    process.exit(1)
  }

  console.log('[create-admin-user] 프로필 테이블을 업데이트합니다.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[create-admin-user] 프로필 조회 중 오류:', profileError)
    process.exit(1)
  }

  if (profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ name: '관리자', role: 'admin', status: 'active' })
      .eq('id', user.id)
    if (error) {
      console.error('[create-admin-user] 프로필 업데이트 실패:', error)
      process.exit(1)
    }
  } else {
    const { error } = await supabase
      .from('profiles')
      .insert({ id: user.id, name: '관리자', role: 'admin', status: 'active' })
    if (error) {
      console.error('[create-admin-user] 프로필 생성 실패:', error)
      process.exit(1)
    }
  }

  console.log('[create-admin-user] 완료되었습니다.')
  console.log(` - 이메일: ${ADMIN_EMAIL}`)
  console.log(` - 임시 비밀번호: ${TEMP_PASSWORD}`)
  console.log('로그인 후 반드시 비밀번호를 변경하세요.')
}

ensureAdminUser().catch((error) => {
  console.error('[create-admin-user] 처리 중 예기치 못한 오류:', error)
  process.exit(1)
})
