-- 학생들의 role을 'student'로 수정
-- 김철수, 이영희, 박민수, 최지은, 정준호의 role이 'teacher'로 잘못 설정된 경우 수정

UPDATE public.profiles
SET role = 'student'
WHERE name IN ('김철수', '이영희', '박민수', '최지은', '정준호')
  AND role = 'teacher';

-- 확인용 쿼리 (실행 후 확인)
-- SELECT id, name, role, status FROM public.profiles 
-- WHERE name IN ('김철수', '이영희', '박민수', '최지은', '정준호')
-- ORDER BY name;

