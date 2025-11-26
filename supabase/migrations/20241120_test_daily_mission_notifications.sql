-- 기간 미션 알림 테스트용 SQL
-- 이 파일은 테스트용이므로 마이그레이션으로 실행하지 마세요.
-- Supabase SQL Editor에서 직접 실행하세요.

-- 1. 현재 활성화된 기간 미션 확인
SELECT 
  ma.id as assignment_id,
  ma.start_date,
  ma.end_date,
  ma.status,
  m.title as mission_title,
  cs.name as student_name,
  p.id as user_id
FROM public.mission_assignments ma
JOIN public.missions m ON m.id = ma.mission_id
JOIN public.class_students cs ON cs.id = ma.student_id
LEFT JOIN public.profiles p ON p.name = cs.name AND p.role = 'student'
WHERE ma.status = 'active'
  AND ma.end_date IS NOT NULL
  AND ma.start_date <= CURRENT_DATE
  AND ma.end_date >= CURRENT_DATE
  AND m.is_active = true
ORDER BY ma.id;

-- 2. 기간 미션 알림 생성 함수 실행
SELECT public.create_daily_mission_notifications() as notifications_created;

-- 3. 생성된 알림 확인
SELECT 
  n.id,
  n.user_id,
  p.name as student_name,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
WHERE n.title = '📚 오늘의 미션'
  AND n.created_at::date = CURRENT_DATE
ORDER BY n.created_at DESC;

