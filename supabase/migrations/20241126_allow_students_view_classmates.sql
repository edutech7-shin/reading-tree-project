-- 학생이 같은 반 친구들을 조회할 수 있도록 RLS 정책 추가

-- 현재 사용자의 teacher_id를 반환하는 보안 정의자 함수 생성
-- 이 함수는 RLS를 우회하여 class_students를 조회할 수 있습니다
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

-- 함수 실행 권한 부여
revoke all on function public.get_current_student_teacher_id() from public;
grant execute on function public.get_current_student_teacher_id() to authenticated;

-- 같은 반 학생들이 서로의 정보를 조회할 수 있도록 정책 추가
drop policy if exists "class students classmates select" on public.class_students;
create policy "class students classmates select" on public.class_students
  for select using (
    -- 현재 사용자가 학생인 경우
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
    and (
      -- 같은 teacher_id를 가진 학생인지 확인 (함수 사용으로 재귀 방지)
      public.get_current_student_teacher_id() = class_students.teacher_id
    )
  );

