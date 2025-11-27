-- 모든 기존 사용자의 status를 'active'로 설정
-- (기존 사용자들이 정상적으로 서비스를 사용할 수 있도록)

-- 1. null이거나 빈 문자열인 경우
update public.profiles
set status = 'active'
where status is null or status = '';

-- 2. 'pending'인 경우
update public.profiles
set status = 'active'
where status = 'pending';

-- 3. 유효하지 않은 값인 경우 (active, approved, suspended가 아닌 경우)
update public.profiles
set status = 'active'
where status not in ('active', 'approved', 'suspended')
   or status is null
   or status = '';

-- 4. 교사와 학생 모두 'active' 상태로 강제 설정
-- (관리자 승인 프로세스가 필요 없는 경우)
update public.profiles
set status = 'active'
where role in ('teacher', 'student');

