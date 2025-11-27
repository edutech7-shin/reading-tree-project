-- user_books 테이블에 teacher_id 컬럼 추가
-- 무한 재귀 문제를 해결하기 위해 teacher_id를 직접 저장

-- 1. teacher_id 컬럼 추가
alter table public.user_books 
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;

-- 2. 인덱스 추가 (성능 향상)
create index if not exists user_books_teacher_id_idx on public.user_books(teacher_id);
create index if not exists user_books_teacher_id_status_idx on public.user_books(teacher_id, status) where status = 'finished';

-- 3. 기존 데이터의 teacher_id 업데이트
-- user_id를 통해 profiles.name을 찾고, class_students에서 teacher_id를 가져옴
update public.user_books ub
set teacher_id = (
  select cs.teacher_id
  from public.profiles p
  join public.class_students cs on cs.name = p.name
  where p.id = ub.user_id
    and p.role = 'student'
  limit 1
)
where ub.teacher_id is null;

-- 4. user_id의 teacher_id를 반환하는 함수 생성 (트리거에서 사용)
create or replace function public.get_user_teacher_id(p_user_id uuid)
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
  -- profiles에서 이름 가져오기 (RLS 우회)
  select name into v_student_name
  from public.profiles
  where id = p_user_id
    and role = 'student'
  limit 1;
  
  if v_student_name is null then
    return null;
  end if;
  
  -- class_students에서 teacher_id 찾기
  select teacher_id into v_teacher_id
  from public.class_students
  where name = v_student_name
  limit 1;
  
  return v_teacher_id;
end;
$$;

-- 함수 실행 권한 부여
revoke all on function public.get_user_teacher_id(uuid) from public;
grant execute on function public.get_user_teacher_id(uuid) to authenticated;

-- 5. INSERT/UPDATE 시 teacher_id 자동 설정 트리거
create or replace function public.set_user_book_teacher_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- teacher_id가 설정되지 않은 경우에만 자동 설정
  if new.teacher_id is null then
    new.teacher_id := public.get_user_teacher_id(new.user_id);
  end if;
  return new;
end;
$$;

-- 트리거 생성
drop trigger if exists trg_set_user_book_teacher_id on public.user_books;
create trigger trg_set_user_book_teacher_id
  before insert or update on public.user_books
  for each row
  execute function public.set_user_book_teacher_id();

-- 6. RLS 정책 재구현 (teacher_id 기반으로 단순화)
-- 기존 classmates 정책 제거
drop policy if exists "user_books classmates select finished" on public.user_books;

-- 새로운 classmates 정책 추가 (teacher_id 직접 비교로 무한 재귀 방지)
-- profiles 조회를 제거하여 무한 재귀 방지
-- get_current_student_teacher_id() 함수가 이미 학생 여부를 확인하므로 별도로 profiles 조회 불필요
create policy "user_books classmates select finished" on public.user_books
  for select using (
    -- 다 읽은 책만
    status = 'finished'
    and (
      -- get_current_student_teacher_id()가 null이 아니면 학생이고, 같은 teacher_id를 가진 경우
      public.get_current_student_teacher_id() = user_books.teacher_id
      and public.get_current_student_teacher_id() is not null
      and user_books.teacher_id is not null
    )
  );
