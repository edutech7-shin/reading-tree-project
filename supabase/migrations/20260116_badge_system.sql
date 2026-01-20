-- 동물 테마 배지 시스템: badges, user_badges, 트리거 로직, 알림 타입 확장

-- 1. notifications type에 'badge' 추가
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('approval', 'rejection', 'level_up', 'badge'));

-- 2. badges 테이블: 배지 정의
-- badge_type: 'trigger' = 조건 충족 시 자동 지급, 'manual' = 교사 수동 지급
-- code: 트리거 로직에서 조건 분기용 (예: squirrel_5_days)
create table if not exists public.badges (
  id bigserial primary key,
  code text unique,
  name text not null,
  description text,
  image_url text not null,
  badge_type text not null check (badge_type in ('trigger', 'manual')),
  acquisition_hint text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists badges_badge_type_idx on public.badges(badge_type);
create index if not exists badges_sort_order_idx on public.badges(sort_order);

-- 3. user_badges 테이블: 유저별 획득 배지
-- granted_by: 교사가 수동 부여한 경우 해당 교사 profiles.id
create table if not exists public.user_badges (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id bigint not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  teacher_comment text,
  unique (user_id, badge_id)
);

create index if not exists user_badges_user_id_idx on public.user_badges(user_id);
create index if not exists user_badges_badge_id_idx on public.user_badges(badge_id);

-- RLS
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- badges: 모든 인증 사용자 읽기
drop policy if exists "badges authenticated select" on public.badges;
create policy "badges authenticated select" on public.badges
  for select to authenticated using (true);

-- user_badges: 본인 것만 조회, insert는 RPC/서비스에서
drop policy if exists "user_badges self select" on public.user_badges;
create policy "user_badges self select" on public.user_badges
  for select using (user_id = auth.uid());

-- 교사는 자신의 학생( class_students )의 user_badges 조회 가능 (name으로 profiles 매칭)
-- 단순화: user_badges insert는 security definer 함수/API에서. select는 본인만.
-- 교사가 학생 배지 현황을 보려면 별도 뷰 또는 RPC가 필요. 현재는 본인 조회만.

-- 4. 시드: 동물 테마 배지
insert into public.badges (code, name, description, image_url, badge_type, acquisition_hint, sort_order) values
  ('squirrel_5_days', '성실한 다람쥐', '5일 연속으로 독서 기록을 남긴 성실한 친구!', '/images/badges/squirrel.svg', 'trigger', '5일 연속으로 읽어보세요!', 1),
  ('owl_wise', '지혜로운 부엉이', '깊이 있는 서평을 쓴 현명한 친구!', '/images/badges/owl.svg', 'manual', '선생님께서 깊이 있는 글쓰기에 주시한 친구에게 수여해요.', 2),
  ('rabbit_first', '호기심 많은 토끼', '첫 번째 독서 기록을 완료한 용감한 친구!', '/images/badges/rabbit.svg', 'trigger', '첫 독서 기록을 작성해보세요!', 0)
on conflict (code) do nothing;

-- 5. 트리거 배지 자동 지급 함수
-- 조건: code='squirrel_5_days' → 최근 5일(오늘 포함) 매일 1건 이상 기록
--       code='rabbit_first'   → 승인된 기록 1건 이상 (또는 기록 1건 이상. '첫 기록 완료'이므로 insert 기준으로는 record 제출 시점. 트리거는 record insert 시 호출되므로 '기록 1건'이면 당일 1건이면 됨. 더 넓게: 전체 book_records 1건 이상.)
create or replace function public.check_and_award_trigger_badges(p_user_id uuid)
returns table (badge_id bigint, name text, description text, image_url text, earned_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count integer;
  v_total integer;
begin
  for r in
    select b.id, b.code, b.name, b.description, b.image_url
    from public.badges b
    where b.badge_type = 'trigger'
      and not exists (select 1 from public.user_badges ub where ub.user_id = p_user_id and ub.badge_id = b.id)
  loop
    if r.code = 'squirrel_5_days' then
      -- 최근 5일(오늘 포함) 각각 1건 이상 기록
      select count(distinct (coalesce(br.record_date, br.created_at::date))) into v_count
      from public.book_records br
      where br.user_id = p_user_id
        and coalesce(br.record_date, br.created_at::date) >= current_date - interval '4 days'
        and coalesce(br.record_date, br.created_at::date) <= current_date;
      if v_count >= 5 then
        insert into public.user_badges (user_id, badge_id, earned_at) values (p_user_id, r.id, now());
        badge_id := r.id; name := r.name; description := r.description; image_url := r.image_url; earned_at := now();
        return next;
      end if;
    elsif r.code = 'rabbit_first' then
      -- 전체 독서 기록 1건 이상 (첫 기록 완료)
      select count(*) into v_total from public.book_records where user_id = p_user_id;
      if v_total >= 1 then
        insert into public.user_badges (user_id, badge_id, earned_at) values (p_user_id, r.id, now());
        badge_id := r.id; name := r.name; description := r.description; image_url := r.image_url; earned_at := now();
        return next;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.check_and_award_trigger_badges(uuid) from public;
grant execute on function public.check_and_award_trigger_badges(uuid) to authenticated;

-- 6. approve_record_and_reward 마지막에 트리거 배지 체크 및 배지 알림 추가
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
  v_rating integer;
  v_short_comment text;
  v_content_text text;
  v_content_image_url text;
  v_points_to_award integer := 0;
  v_badge record;
begin
  select
    user_id, book_title, rating, short_comment, content_text, content_image_url
  into
    v_user_id, v_book_title, v_rating, v_short_comment, v_content_text, v_content_image_url
  from public.book_records
  where id = p_record_id and status = 'pending';

  if not found then
    raise exception 'record not found or not pending';
  end if;

  if v_rating is not null and v_short_comment is null and v_content_text is null and v_content_image_url is null then
    v_points_to_award := 2;
  elsif v_rating is not null and v_short_comment is not null and v_content_text is null and v_content_image_url is null then
    v_points_to_award := 3;
  elsif v_rating is not null and v_short_comment is null and v_content_text is not null and v_content_image_url is null then
    v_points_to_award := 7;
  elsif v_rating is not null and v_short_comment is not null and v_content_text is not null and v_content_image_url is null then
    v_points_to_award := 8;
  elsif v_rating is not null and v_short_comment is null and v_content_text is null and v_content_image_url is not null then
    v_points_to_award := 4;
  elsif v_rating is not null and v_short_comment is not null and v_content_text is null and v_content_image_url is not null then
    v_points_to_award := 5;
  elsif v_rating is not null and v_short_comment is null and v_content_text is not null and v_content_image_url is not null then
    v_points_to_award := 9;
  elsif v_rating is not null and v_short_comment is not null and v_content_text is not null and v_content_image_url is not null then
    v_points_to_award := 10;
  else
    v_points_to_award := 0;
  end if;

  select level into v_old_level from public.profiles where id = v_user_id;

  update public.book_records set status = 'approved', approved_at = now() where id = p_record_id;
  update public.profiles set points = points + v_points_to_award where id = v_user_id;

  select count(*) into v_approved_count from public.book_records where user_id = v_user_id and status = 'approved';
  v_new_level := greatest(1, (v_approved_count / 5) + 1);

  if v_new_level > v_old_level then
    update public.profiles set level = v_new_level where id = v_user_id;
    perform public.create_notification(v_user_id, 'level_up', '🎉 레벨업 축하해요!', format('축하합니다! 레벨 %s로 올라갔어요!', v_new_level), null);
  end if;

  perform public.create_notification(
    v_user_id, 'approval', '✅ 독서 기록이 승인되었어요!',
    format('"%s" 독서 기록이 승인되어 물방울 %s점을 받았어요!', coalesce(v_book_title, '독서 기록'), v_points_to_award),
    p_record_id
  );

  update public.class_trees set current_leaves = current_leaves + 1 where id = (select id from public.class_trees order by id limit 1);

  select current_leaves, level_up_target, current_level into v_leaves, v_target, v_old_level from public.class_trees order by id limit 1;
  if v_leaves >= v_target then
    update public.class_trees set current_level = current_level + 1, current_leaves = 0 where id = (select id from public.class_trees order by id limit 1);
    perform public.create_notification(profile.id, 'level_up', '🌳 우리 반 나무가 레벨업했어요!', format('축하합니다! 반 나무가 레벨 %s로 올라갔어요!', v_old_level + 1), null)
    from public.profiles profile where profile.role = 'student';
  end if;

  -- 트리거 배지 체크 및 알림 (승인으로 인해 조건 충족 시)
  for v_badge in select * from public.check_and_award_trigger_badges(v_user_id)
  loop
    perform public.create_notification(
      v_user_id, 'badge', '🦔 ' || v_badge.name || ' 배지를 획득했어요!', coalesce(v_badge.description, '축하해요!'), null
    );
  end loop;
end;
$$;

-- user_badges insert를 RPC/백엔드에서 하므로, anon/authenticated의 insert 정책은 생략.
-- need: service role or definer functions. check_and_award_trigger_badges is definer.
-- 교사 수동 부여는 /api/teacher/badges/grant에서 service/client로 insert. 
-- API는 createSupabaseServerClient (cookie auth) → authenticated. 
-- user_badges에 insert 정책이 없으면 authenticated가 insert 불가.
-- Grant: 교사가 특정 user_id에게 배지 부여. 그 user_id는 학생(다른 유저). 
-- RLS: insert with check (user_id = auth.uid())면 본인에게만 가능. 우리는 교사가 학생에게 주므로
-- insert with check (true) and role=teacher? 불가. RLS는 행 단위라 "이 row의 user_id"만 봄.
-- 해결: user_badges insert를 RPC로. create function grant_badge(p_teacher_id, p_user_ids uuid[], p_badge_id, p_comment) 
--   security definer로 p_user_ids 각각에 insert. 그런 다음 API는 RPC 호출.
-- 이렇게 하면 RLS insert 정책을 둘 필요 없음. RPC가 definer로 insert.
-- 교사 부여 전용 RPC: grant_badges_to_students(p_teacher_id uuid, p_class_student_ids uuid[], p_badge_id bigint, p_comment text default null)
-- 이 RPC가 class_students에서 name으로 profiles.id를 찾고, badge가 manual인지 확인, user_badges insert.
create or replace function public.grant_badges_to_students(
  p_teacher_id uuid,
  p_class_student_ids uuid[],
  p_badge_id bigint,
  p_comment text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_type text;
  v_badge_name text;
  v_user_id uuid;
  v_name text;
  v_granted integer := 0;
  v_rows integer;
begin
  select badge_type, name into v_badge_type, v_badge_name from public.badges where id = p_badge_id;
  if not found or v_badge_type <> 'manual' then
    raise exception 'badge not found or not manual type';
  end if;

  for v_name in select cs.name from public.class_students cs where cs.id = any(p_class_student_ids) and cs.teacher_id = p_teacher_id
  loop
    select p.id into v_user_id from public.profiles p where p.name = v_name and p.role = 'student' limit 1;
    if v_user_id is not null then
      insert into public.user_badges (user_id, badge_id, earned_at, granted_by, teacher_comment)
      values (v_user_id, p_badge_id, now(), p_teacher_id, p_comment)
      on conflict (user_id, badge_id) do nothing;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then
        v_granted := v_granted + 1;
        perform public.create_notification(
          v_user_id, 'badge',
          '🏅 선생님께서 배지를 주셨어요!',
          v_badge_name || ' 배지를 받았어요. ' || coalesce(p_comment, ''),
          null
        );
      end if;
    end if;
  end loop;
  return v_granted;
end;
$$;

revoke all on function public.grant_badges_to_students(uuid, uuid[], bigint, text) from public;
grant execute on function public.grant_badges_to_students(uuid, uuid[], bigint, text) to authenticated;
