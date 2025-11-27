-- profiles self select 정책이 제대로 작동하는지 확인하고 수정
-- status와 무관하게 본인 프로필 조회가 가능하도록 보장

-- 기존 정책 삭제
drop policy if exists "profiles self select" on public.profiles;

-- 본인 프로필 조회 정책 재생성 (status 체크 없이)
create policy "profiles self select" on public.profiles
  for select 
  using (auth.uid() = id);

-- 정책이 제대로 생성되었는지 확인
-- 다음 쿼리로 확인 가능:
-- select schemaname, tablename, policyname, qual 
-- from pg_policies 
-- where tablename = 'profiles' and policyname = 'profiles self select';

