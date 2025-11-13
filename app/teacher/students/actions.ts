'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

function sanitizeNames(rawNames: string[]) {
  const unique = new Set<string>()
  rawNames.forEach((entry) => {
    const trimmed = entry.trim()
    if (trimmed) {
      unique.add(trimmed)
    }
  })
  return Array.from(unique)
}

async function assertTeacher() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error('교사 정보를 확인하는 중 문제가 발생했습니다.')
  }

  if (profile?.role !== 'teacher') {
    throw new Error('교사 권한이 필요합니다.')
  }

  return { supabase, userId: user.id }
}

export async function addStudentsByNamesAction(rawInput: string) {
  const { supabase, userId } = await assertTeacher()

  const normalized = rawInput
    .split(/[\n,]/)
    .map((token) => token.replace(/\s+/g, ' ').trim())

  const names = sanitizeNames(normalized)

  if (names.length === 0) {
    throw new Error('학생 이름을 하나 이상 입력해주세요.')
  }

  const { data: lastStudent, error: maxError } = await supabase
    .from('class_students')
    .select('student_number')
    .eq('teacher_id', userId)
    .order('student_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) {
    throw new Error('학생 번호를 확인할 수 없습니다.')
  }

  const startNumber = lastStudent?.student_number ?? 0

  const rows = names.map((name, index) => ({
    teacher_id: userId,
    student_number: startNumber + index + 1,
    name,
    avatar_type: 'rookie',
    level: 1,
    leaves: 0
  }))

  const { error: insertError } = await supabase
    .from('class_students')
    .insert(rows)

  if (insertError) {
    throw new Error(insertError.message || '학생을 추가하는 중 오류가 발생했습니다.')
  }

  revalidatePath('/teacher/students')
}

export async function deleteStudentsAction(studentIds: string[]) {
  const { supabase, userId } = await assertTeacher()

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('삭제할 학생을 선택해주세요.')
  }

  const { error: deleteError } = await supabase
    .from('class_students')
    .delete()
    .in('id', studentIds)
    .eq('teacher_id', userId)

  if (deleteError) {
    throw new Error(deleteError.message || '학생을 삭제하는 중 오류가 발생했습니다.')
  }

  revalidatePath('/teacher/students')
}

