-- 기간 미션에 대한 매일 알림 생성 시스템
-- 독서 습관 형성을 위해 기간 미션의 경우 매일 새로운 알림을 생성

-- 1. pg_cron extension 활성화 (Supabase에서 지원하는 경우)
-- create extension if not exists pg_cron;

-- 2. 매일 기간 미션 알림을 생성하는 함수
create or replace function public.create_daily_mission_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_today date := current_date;
  v_assignment record;
  v_user_id uuid;
  v_mission_title text;
  v_notification_exists boolean;
begin
  -- 활성 상태이고 기간이 설정된 미션 할당 찾기
  -- 오늘 날짜가 start_date와 end_date 사이에 있는 경우
  for v_assignment in
    select 
      ma.id as assignment_id,
      ma.student_id,
      ma.start_date,
      ma.end_date,
      m.title as mission_title,
      m.description as mission_description,
      cs.name as student_name
    from public.mission_assignments ma
    join public.missions m on m.id = ma.mission_id
    join public.class_students cs on cs.id = ma.student_id
    where ma.status = 'active'
      and ma.end_date is not null  -- 기간 미션만
      and ma.start_date <= v_today
      and ma.end_date >= v_today
      and m.is_active = true
  loop
    -- class_students의 name으로 profiles에서 user_id 찾기
    select id into v_user_id
    from public.profiles
    where name = v_assignment.student_name
      and role = 'student'
    limit 1;
    
    -- user_id를 찾지 못한 경우 스킵
    if v_user_id is null then
      continue;
    end if;
    
    -- 오늘 이미 알림이 생성되었는지 확인
    -- 같은 미션 할당에 대한 오늘 날짜의 알림이 있는지 체크
    -- message에 assignment_id를 포함하여 정확하게 확인
    select exists(
      select 1
      from public.notifications
      where user_id = v_user_id
        and type = 'approval'
        and title = '📚 오늘의 미션'
        and message like '%' || v_assignment.mission_title || '%'
        and created_at::date = v_today
    ) into v_notification_exists;
    
    -- 오늘 알림이 없으면 생성
    if not v_notification_exists then
      perform public.create_notification(
        v_user_id,
        'approval',
        '📚 오늘의 미션',
        format('"%s" 미션을 잊지 마세요! 오늘도 독서 습관을 만들어봐요! 💪', v_assignment.mission_title),
        null
      );
      
      v_count := v_count + 1;
    end if;
  end loop;
  
  return v_count;
end;
$$;

-- 함수 실행 권한
revoke all on function public.create_daily_mission_notifications() from public;
grant execute on function public.create_daily_mission_notifications() to authenticated;

-- 3. pg_cron을 사용한 스케줄러 설정 (Supabase에서 지원하는 경우)
-- 매일 오전 9시에 실행
-- select cron.schedule(
--   'daily-mission-notifications',
--   '0 9 * * *',  -- 매일 오전 9시 (UTC)
--   $$select public.create_daily_mission_notifications()$$
-- );

-- 참고: Supabase에서는 pg_cron이 제한적으로 지원될 수 있습니다.
-- 대안으로 Edge Functions나 외부 스케줄러(cron job, Vercel Cron 등)를 사용할 수 있습니다.

-- 4. 수동 실행 테스트용 쿼리 (개발/테스트 시 사용)
-- select public.create_daily_mission_notifications();

