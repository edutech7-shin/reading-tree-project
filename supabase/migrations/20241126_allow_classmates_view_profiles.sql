-- 같은 반 학생들이 서로의 프로필을 조회할 수 있도록 RLS 정책 추가
-- (이름 정보를 가져오기 위해 필요)

-- 특정 프로필의 teacher_id를 반환하는 함수
create or replace function public.get_profile_teacher_id(p_profile_id uuid)
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
  -- 프로필의 이름 가져오기
  select name into v_student_name
  from public.profiles
  where id = p_profile_id
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
revoke all on function public.get_profile_teacher_id(uuid) from public;
grant execute on function public.get_profile_teacher_id(uuid) to authenticated;

-- 같은 반 학생들의 프로필을 조회할 수 있도록 정책 추가
drop policy if exists "profiles classmates select" on public.profiles;
create policy "profiles classmates select" on public.profiles
  for select using (
    -- 학생 프로필만
    role = 'student'
    and (
      -- 현재 사용자가 학생이고, 같은 반인지 확인 (함수 사용으로 재귀 방지)
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
      )
      and public.get_current_student_teacher_id() = public.get_profile_teacher_id(profiles.id)
      and public.get_current_student_teacher_id() is not null
    )
  );

