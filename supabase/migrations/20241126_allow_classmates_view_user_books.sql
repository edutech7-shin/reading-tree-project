-- 같은 반 학생들이 서로의 다 읽은 책(user_books)을 볼 수 있도록 RLS 정책 추가
-- 보안 정의자 함수를 사용하여 무한 재귀 방지

-- get_record_owner_teacher_id 함수가 이미 존재할 수 있으므로 확인 후 생성
-- (20241126_allow_classmates_view_activities.sql에서 이미 생성됨)

-- user_books의 소유자(user_books.user_id)의 teacher_id를 반환하는 함수
-- (get_record_owner_teacher_id와 동일한 로직이지만 명확성을 위해 별도 함수 사용)
create or replace function public.get_user_book_owner_teacher_id(p_user_id uuid)
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
  -- 책 소유자의 이름 가져오기
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

-- 함수 실행 권한 부여
revoke all on function public.get_user_book_owner_teacher_id(uuid) from public;
grant execute on function public.get_user_book_owner_teacher_id(uuid) to authenticated;

drop policy if exists "user_books classmates select finished" on public.user_books;
create policy "user_books classmates select finished" on public.user_books
  for select using (
    -- 다 읽은 책만
    status = 'finished'
    and (
      -- 현재 사용자가 학생이고, 같은 반인지 확인 (함수 사용으로 재귀 방지)
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'student'
      )
      and public.get_current_student_teacher_id() = public.get_user_book_owner_teacher_id(user_books.user_id)
      and public.get_current_student_teacher_id() is not null
    )
  );

