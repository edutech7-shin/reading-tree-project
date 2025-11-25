-- 테스트 반에 소속된 학생들의 이메일 계정 확인
-- class_students의 name과 profiles의 name을 매칭하여 auth.users의 이메일 조회

-- 방법 1: profiles를 통해 확인 (name으로 매칭)
-- 이 방법은 profiles에 있는 학생 정보를 보여줍니다
SELECT 
  cs.name AS 학생이름,
  cs.student_number AS 번호,
  p.id AS profile_id,
  p.role AS 역할,
  p.status AS 상태
FROM public.class_students cs
LEFT JOIN public.profiles p ON p.name = cs.name AND p.role = 'student'
ORDER BY cs.student_number;

-- 방법 2: auth.users 테이블 직접 조회 (관리자 권한 필요)
-- Supabase SQL Editor에서 실행 시 auth 스키마에 접근 가능
-- 주의: 이 쿼리는 Supabase 관리자 권한이 필요할 수 있습니다
SELECT 
  cs.name AS 학생이름,
  cs.student_number AS 번호,
  au.email AS 이메일,
  p.role AS 역할,
  p.status AS 상태
FROM public.class_students cs
LEFT JOIN public.profiles p ON p.name = cs.name AND p.role = 'student'
LEFT JOIN auth.users au ON au.id = p.id
ORDER BY cs.student_number;

-- 방법 3: 특정 교사의 학생들만 확인
-- teacher_id를 알고 있다면 이 쿼리를 사용하세요
-- 예: 특정 교사 ID로 필터링
/*
SELECT 
  cs.name AS 학생이름,
  cs.student_number AS 번호,
  au.email AS 이메일,
  p.role AS 역할,
  p.status AS 상태
FROM public.class_students cs
LEFT JOIN public.profiles p ON p.name = cs.name AND p.role = 'student'
LEFT JOIN auth.users au ON au.id = p.id
WHERE cs.teacher_id = '교사_UUID_여기에_입력'
ORDER BY cs.student_number;
*/

-- 방법 4: 이름으로 직접 검색 (김철수, 이영희, 박민수 등)
SELECT 
  cs.name AS 학생이름,
  cs.student_number AS 번호,
  au.email AS 이메일,
  p.role AS 역할,
  p.status AS 상태
FROM public.class_students cs
LEFT JOIN public.profiles p ON p.name = cs.name AND p.role = 'student'
LEFT JOIN auth.users au ON au.id = p.id
WHERE cs.name IN ('김철수', '이영희', '박민수', '최지은', '정준호')
ORDER BY cs.name;

-- 참고: 테스트 데이터 기준 예상 이메일
-- 김철수: student1@test.com
-- 이영희: student2@test.com
-- 박민수: student3@test.com
-- 최지은: student4@test.com
-- 정준호: student5@test.com

