-- user_books 테이블에 RLS 정책 추가
alter table public.user_books enable row level security;

-- 본인만 조회 가능
drop policy if exists "user_books self select" on public.user_books;
create policy "user_books self select" on public.user_books
  for select using (user_id = auth.uid());

-- 본인만 삽입 가능
drop policy if exists "user_books self insert" on public.user_books;
create policy "user_books self insert" on public.user_books
  for insert with check (user_id = auth.uid());

-- 본인만 수정 가능
drop policy if exists "user_books self update" on public.user_books;
create policy "user_books self update" on public.user_books
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 본인만 삭제 가능
drop policy if exists "user_books self delete" on public.user_books;
create policy "user_books self delete" on public.user_books
  for delete using (user_id = auth.uid());

