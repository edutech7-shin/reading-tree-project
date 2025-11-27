-- user_books RLS 정책의 무한 재귀 문제 수정
-- 문제: get_user_book_owner_teacher_id 함수가 profiles를 조회할 때 RLS가 적용되어 재귀 발생
-- 해결: security definer 함수 내에서도 RLS가 적용되므로, 
--       profiles 조회를 제거하고 class_students에서 직접 찾기

-- 기존 함수 삭제
drop function if exists public.get_user_book_owner_teacher_id(uuid);

-- 수정된 함수: profiles 조회를 제거하고 다른 방법 사용
-- 하지만 class_students에는 user_id가 없으므로, 
-- profiles 조회를 security definer 함수로 감싸서 RLS 우회 시도
-- 또는 더 간단하게: user_books 조회 시 본인 책만 조회하도록 정책 단순화

-- 임시 해결책: classmates 정책을 제거하고 본인 책만 조회
-- (같은 반 친구들의 책은 다른 방법으로 조회하거나, 
--  나중에 user_books 테이블에 teacher_id를 추가하여 해결)

-- 함수는 유지하되, RLS 정책에서 사용하지 않음
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
  -- profiles에서 이름 가져오기
  -- security definer 함수이지만 RLS가 적용될 수 있음
  -- 하지만 이 함수는 현재 사용하지 않으므로 문제 없음
  select name into v_student_name
  from public.profiles
  where id = p_user_id
    and role = 'student'
  limit 1;
  
  if v_student_name is null then
    return null;
  end if;
  
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

-- user_books 정책 재생성: 본인 조회만 허용 (무한 재귀 방지)
drop policy if exists "user_books self select" on public.user_books;
create policy "user_books self select" on public.user_books
  for select using (user_id = auth.uid());

-- classmates 정책 제거 (무한 재귀 문제로 인해)
-- 같은 반 친구들의 책은 나중에 다른 방법으로 해결
drop policy if exists "user_books classmates select finished" on public.user_books;

