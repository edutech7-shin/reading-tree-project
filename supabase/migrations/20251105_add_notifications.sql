-- notifications: 알림 테이블
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('approval', 'rejection', 'level_up')),
  title text not null,
  message text not null,
  related_record_id bigint references public.book_records(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- RLS 설정
alter table public.notifications enable row level security;

-- 알림 정책: 본인만 조회/업데이트 가능
drop policy if exists "notifications self select" on public.notifications;
create policy "notifications self select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications self insert" on public.notifications;
create policy "notifications self insert" on public.notifications
  for insert with check (user_id = auth.uid());

-- 알림 생성 함수 (시스템에서 사용)
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_record_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id bigint;
begin
  insert into public.notifications (user_id, type, title, message, related_record_id)
  values (p_user_id, p_type, p_title, p_message, p_related_record_id)
  returning id into v_notification_id;
  
  return v_notification_id;
end;
$$;

-- 함수 실행 권한
revoke all on function public.create_notification(uuid, text, text, text, bigint) from public;
grant execute on function public.create_notification(uuid, text, text, text, bigint) to authenticated;

-- 승인 시 알림 생성 로직 추가를 위한 함수 수정
-- approve_record_and_reward 함수에 알림 생성 추가
create or replace function public.approve_record_and_reward(p_record_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_leaves integer;
  v_target integer;
  v_book_title text;
  v_old_level integer;
  v_new_level integer;
  v_approved_count integer;
begin
  -- 기록 정보 가져오기
  select user_id, book_title into v_user_id, v_book_title
  from public.book_records
  where id = p_record_id and status = 'pending';
  
  if not found then
    raise exception 'record not found or not pending';
  end if;

  -- 학생 현재 레벨 저장 (레벨업 체크용)
  select level into v_old_level from public.profiles where id = v_user_id;

  -- 기록 승인 처리
  update public.book_records
    set status = 'approved', approved_at = now()
    where id = p_record_id;

  -- 학생 포인트 +10
  update public.profiles set points = points + 10 where id = v_user_id;

  -- 학생 개인 레벨업 체크 (승인된 기록 수 기준: 5개마다 레벨업)
  select count(*) into v_approved_count
  from public.book_records
  where user_id = v_user_id and status = 'approved';
  
  -- 승인된 기록 수에 따라 레벨 계산 (5개마다 레벨 1 증가, 최소 레벨 1)
  v_new_level := greatest(1, (v_approved_count / 5) + 1);
  
  -- 레벨이 올라갔으면 업데이트
  if v_new_level > v_old_level then
    update public.profiles set level = v_new_level where id = v_user_id;
    
    -- 개인 레벨업 알림 생성
    perform public.create_notification(
      v_user_id,
      'level_up',
      '🎉 레벨업 축하해요!',
      format('축하합니다! 레벨 %s로 올라갔어요!', v_new_level),
      null
    );
  end if;

  -- 승인 알림 생성
  perform public.create_notification(
    v_user_id,
    'approval',
    '✅ 독서 기록이 승인되었어요!',
    format('"%s" 독서 기록이 승인되어 물방울 10점을 받았어요!', coalesce(v_book_title, '독서 기록')),
    p_record_id
  );

  -- 반 나무는 단일 행 사용 가정: 첫 행에 +1
  update public.class_trees 
    set current_leaves = current_leaves + 1
    where id = (select id from public.class_trees order by id limit 1);

  -- 반 나무 레벨업 체크
  select current_leaves, level_up_target, current_level into v_leaves, v_target, v_old_level
    from public.class_trees 
    order by id limit 1;
    
  if v_leaves >= v_target then
    update public.class_trees
      set current_level = current_level + 1,
          current_leaves = 0
      where id = (select id from public.class_trees order by id limit 1);
    
    -- 반 나무 레벨업 알림 생성 (모든 학생에게)
    perform public.create_notification(
      profile.id,
      'level_up',
      '🌳 우리 반 나무가 레벨업했어요!',
      format('축하합니다! 반 나무가 레벨 %s로 올라갔어요!', v_old_level + 1),
      null
    )
    from public.profiles profile
    where profile.role = 'student';
  end if;
end;
$$;

