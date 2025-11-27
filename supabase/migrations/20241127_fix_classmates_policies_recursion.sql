-- classmates RLS 정책에서 profiles 조회 제거하여 무한 재귀 방지
-- get_current_student_teacher_id() 함수가 이미 학생 여부를 확인하므로 별도로 profiles 조회 불필요

-- 1. profiles classmates 정책 수정
drop policy if exists "profiles classmates select" on public.profiles;

create policy "profiles classmates select" on public.profiles
  for select using (
    -- 학생 프로필만
    role = 'student'
    and (
      -- get_current_student_teacher_id()가 null이 아니면 학생이고, 같은 teacher_id를 가진 경우
      public.get_current_student_teacher_id() = public.get_profile_teacher_id(profiles.id)
      and public.get_current_student_teacher_id() is not null
    )
  );

-- 2. book_records classmates 정책 수정
drop policy if exists "records classmates select approved" on public.book_records;

create policy "records classmates select approved" on public.book_records
  for select using (
    -- 승인된 기록만
    status = 'approved'
    and (
      -- get_current_student_teacher_id()가 null이 아니면 학생이고, 같은 teacher_id를 가진 경우
      public.get_current_student_teacher_id() = public.get_record_owner_teacher_id(book_records.user_id)
      and public.get_current_student_teacher_id() is not null
    )
  );

-- 3. mission_completions classmates 정책 수정
drop policy if exists "mission_completions classmates select approved" on public.mission_completions;

create policy "mission_completions classmates select approved" on public.mission_completions
  for select using (
    -- 승인된 완료 기록만
    verification_status = 'approved'
    and (
      -- get_current_student_teacher_id()가 null이 아니면 학생이고, 같은 teacher_id를 가진 경우
      public.get_current_student_teacher_id() = public.get_completion_student_teacher_id(mission_completions.student_id)
      and public.get_current_student_teacher_id() is not null
    )
  );
