-- 모든 기존 사용자의 status를 'active'로 설정
-- (기존 사용자들이 정상적으로 서비스를 사용할 수 있도록)

update public.profiles
set status = 'active'
where status is null 
   or status = ''
   or status = 'pending'
   or status not in ('active', 'approved', 'suspended');

-- 교사와 학생 모두 'active' 상태로 설정
-- (관리자 승인 프로세스가 필요 없는 경우)

