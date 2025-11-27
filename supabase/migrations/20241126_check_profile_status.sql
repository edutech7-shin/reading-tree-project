-- 프로필 상태 확인 및 수정 스크립트
-- 모든 사용자의 현재 상태를 확인하고 필요시 'active'로 설정

-- 1. 현재 프로필 상태 확인
select 
  id,
  name,
  role,
  status,
  created_at
from public.profiles
order by created_at desc;

-- 2. status가 null이거나 빈 문자열인 경우 'active'로 설정
update public.profiles
set status = 'active'
where status is null 
   or status = '';

-- 3. status가 'pending'인 경우 'active'로 설정
update public.profiles
set status = 'active'
where status = 'pending';

-- 4. 최종 상태 확인
select 
  id,
  name,
  role,
  status,
  created_at
from public.profiles
where status != 'active' and status != 'approved'
order by created_at desc;

