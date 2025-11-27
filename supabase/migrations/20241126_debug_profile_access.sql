-- 프로필 조회 권한 디버깅 스크립트
-- 특정 사용자의 프로필 조회가 가능한지 확인

-- 1. 모든 프로필의 상태 확인
select 
  p.id,
  p.name,
  p.role,
  p.status,
  u.email
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at desc;

-- 2. RLS 정책 확인
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where tablename = 'profiles'
order by policyname;

-- 3. 특정 사용자로 프로필 조회 테스트 (service role로 실행)
-- 이 쿼리는 Supabase Dashboard의 SQL Editor에서 service role로 실행해야 합니다
-- 
-- select 
--   p.id,
--   p.name,
--   p.role,
--   p.status
-- from public.profiles p
-- where p.id = 'USER_ID_HERE';

