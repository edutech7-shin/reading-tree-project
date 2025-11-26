-- 같은 반 학생들이 서로의 승인된 활동을 볼 수 있도록 RLS 정책 추가
-- 보안 정의자 함수를 사용하여 무한 재귀 방지

-- 현재 사용자의 teacher_id를 반환하는 함수 (이미 존재할 수 있음)
create or replace function public.get_current_student_teacher_id()
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_teacher_id uuid;
  v_student_name text;
begin
  -- 현재 사용자의 이름 가져오기
  select name into v_student_name
  from public.profiles
  where id = auth.uid()
    and role = 'student';
  
  if v_student_name is null then
    return null;
  end if;
  
  -- class_students에서 teacher_id 찾기 (RLS 우회)
  select teacher_id into v_teacher_id
  from public.class_students
  where name = v_student_name
  limit 1;
  
  return v_teacher_id;
end;
$$;

-- 기록의 소유자(book_records.user_id)의 teacher_id를 반환하는 함수
create or replace function public.get_record_owner_teacher_id(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_teacher_id uuid;
  v_student_name text;
begin
  -- 기록 소유자의 이름 가져오기
  select name into v_student_name
  from public.profiles
  where id = p_user_id
    and role = 'student';
  
  if v_student_name is null then
    return null;
  end if;
  
  -- class_students에서 teacher_id 찾기 (RLS 우회)
  select teacher_id into v_teacher_id
  from public.class_students
  where name = v_student_name
  limit 1;
  
  return v_teacher_id;
end;
$$;

-- mission_completions의 student_id(class_students.id)의 teacher_id를 반환하는 함수
create or replace function public.get_completion_student_teacher_id(p_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_teacher_id uuid;
begin
  -- class_students에서 teacher_id 찾기 (RLS 우회)
  select teacher_id into v_teacher_id
  from public.class_students
  where id = p_student_id
  limit 1;
  
  return v_teacher_id;
end;
$$;

-- 함수 실행 권한 부여
revoke all on function public.get_current_student_teacher_id() from public;
grant execute on function public.get_current_student_teacher_id() to authenticated;

revoke all on function public.get_record_owner_teacher_id(uuid) from public;
grant execute on function public.get_record_owner_teacher_id(uuid) to authenticated;

revoke all on function public.get_completion_student_teacher_id(uuid) from public;
grant execute on function public.get_completion_student_teacher_id(uuid) to authenticated;

-- 1. book_records: 같은 반 학생들이 승인된 독서 기록을 볼 수 있도록 정책 추가
drop policy if exists "records classmates select approved" on public.book_records;
create policy "records classmates select approved" on public.book_records
  for select using (
    -- 승인된 기록만
    status = 'approved'
    and (
      -- 현재 사용자가 학생이고, 같은 반인지 확인 (함수 사용으로 재귀 방지)
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
      )
      and public.get_current_student_teacher_id() = public.get_record_owner_teacher_id(book_records.user_id)
      and public.get_current_student_teacher_id() is not null
    )
  );

-- 2. mission_completions: 같은 반 학생들이 승인된 미션 완료 기록을 볼 수 있도록 정책 추가
drop policy if exists "mission_completions classmates select approved" on public.mission_completions;
create policy "mission_completions classmates select approved" on public.mission_completions
  for select using (
    -- 승인된 완료 기록만
    verification_status = 'approved'
    and (
      -- 현재 사용자가 학생이고, 같은 반인지 확인 (함수 사용으로 재귀 방지)
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
      )
      and public.get_current_student_teacher_id() = public.get_completion_student_teacher_id(mission_completions.student_id)
      and public.get_current_student_teacher_id() is not null
    )
  );

