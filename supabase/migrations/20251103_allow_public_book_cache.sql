-- book_cache 테이블을 공개 캐시로 변경
-- 모든 사용자(인증/비인증)가 읽고 쓸 수 있도록 RLS 정책 수정

-- 기존 정책 제거
drop policy if exists "book_cache select all" on public.book_cache;
drop policy if exists "book_cache insert authenticated" on public.book_cache;
drop policy if exists "book_cache update authenticated" on public.book_cache;

-- 모든 사용자가 읽을 수 있도록 (기존과 동일하지만 명확히)
create policy "book_cache select all" on public.book_cache
  for select using (true);

-- 모든 사용자가 캐시에 쓸 수 있도록 (공개 캐시)
create policy "book_cache insert all" on public.book_cache
  for insert with check (true);

create policy "book_cache update all" on public.book_cache
  for update using (true) with check (true);

