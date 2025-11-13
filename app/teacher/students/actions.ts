'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

const MAX_STUDENTS = 30

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

async function assertStudentCapacity(supabase: ReturnType<typeof createSupabaseServerClient>, teacherId: string, additional: number) {
  const { count, error } = await supabase
    .from('class_students')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacherId)

  if (error) {
    throw new Error('학생 수를 확인하는 중 문제가 발생했습니다.')
  }

  const current = count ?? 0
  if (current + additional > MAX_STUDENTS) {
    throw new Error(`학생은 최대 ${MAX_STUDENTS}명까지 등록할 수 있습니다.`)
  }

  return current
}

function buildStudentRows(teacherId: string, numbers: number[], names?: string[]) {
  return numbers.map((studentNumber, index) => ({
    teacher_id: teacherId,
    student_number: studentNumber,
    name: names?.[index] ?? `학생${studentNumber}`,
    avatar_type: 'rookie',
    level: 1,
    leaves: 0
  }))
}

async function ensureNumbersAvailable(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  teacherId: string,
  numbers: number[]
) {
  const uniqueNumbers = Array.from(new Set(numbers)).sort((a, b) => a - b)

  if (uniqueNumbers.some((num) => !Number.isInteger(num) || num <= 0)) {
    throw new Error('학생 번호는 1 이상의 정수여야 합니다.')
  }

  const { data: existing, error } = await supabase
    .from('class_students')
    .select('student_number')
    .eq('teacher_id', teacherId)
    .in('student_number', uniqueNumbers)

  if (error) {
    throw new Error('학생 번호 중복 여부를 확인할 수 없습니다.')
  }

  if (existing && existing.length > 0) {
    const duplicates = existing.map((item) => item.student_number).sort((a, b) => a - b)
    throw new Error(`이미 등록된 번호가 포함되어 있습니다: ${duplicates.join(', ')}`)
  }

  return uniqueNumbers
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

  await assertStudentCapacity(supabase, userId, names.length)

  const { data: existing, error: existingError } = await supabase
    .from('class_students')
    .select('student_number')
    .eq('teacher_id', userId)
    .order('student_number', { ascending: false })
    .limit(1)

  if (existingError) {
    throw new Error('학생 번호를 확인할 수 없습니다.')
  }

  const lastNumber = existing?.[0]?.student_number ?? 0
  const numbers = names.map((_, index) => lastNumber + index + 1)

  const rows = buildStudentRows(userId, numbers, names)

  const { error: insertError } = await supabase
    .from('class_students')
    .insert(rows)

  if (insertError) {
    throw new Error(insertError.message || '학생을 추가하는 중 오류가 발생했습니다.')
  }

  revalidatePath('/teacher/students')
}

export async function addStudentsByNumberRangeAction(firstNumber: number, lastNumber: number) {
  const { supabase, userId } = await assertTeacher()

  if (!Number.isInteger(firstNumber) || !Number.isInteger(lastNumber)) {
    throw new Error('번호는 정수로 입력해주세요.')
  }

  if (firstNumber <= 0 || lastNumber <= 0) {
    throw new Error('번호는 1 이상이어야 합니다.')
  }

  if (firstNumber > lastNumber) {
    throw new Error('첫 번호는 마지막 번호보다 작거나 같아야 합니다.')
  }

  const numbers = Array.from({ length: lastNumber - firstNumber + 1 }, (_, index) => firstNumber + index)

  await assertStudentCapacity(supabase, userId, numbers.length)
  const availableNumbers = await ensureNumbersAvailable(supabase, userId, numbers)

  const rows = buildStudentRows(userId, availableNumbers)

  const { error: insertError } = await supabase
    .from('class_students')
    .insert(rows)

  if (insertError) {
    throw new Error(insertError.message || '학생을 추가하는 중 오류가 발생했습니다.')
  }

  revalidatePath('/teacher/students')
}

export async function addStudentsByNumberListAction(numbers: number[]) {
  const { supabase, userId } = await assertTeacher()

  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('학생 번호를 하나 이상 입력해주세요.')
  }

  await assertStudentCapacity(supabase, userId, numbers.length)
  const availableNumbers = await ensureNumbersAvailable(supabase, userId, numbers)

  const rows = buildStudentRows(userId, availableNumbers)

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

