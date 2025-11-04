-- profiles: auth.users의 보조 프로필
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  nickname text not null,
  role text not null default 'student' check (role in ('teacher','student')),
  level integer not null default 1,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- class_trees: 반 나무 현황
create table if not exists public.class_trees (
  id bigserial primary key,
  class_name text not null unique,
  current_level integer not null default 1,
  current_leaves integer not null default 0,
  level_up_target integer not null default 50,
  created_at timestamptz not null default now()
);

-- book_records: 학생 독서 기록
create table if not exists public.book_records (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_title text,
  book_author text,
  book_cover_url text,
  content_text text,
  content_image_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  teacher_comment text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists book_records_user_id_idx on public.book_records(user_id);
create index if not exists book_records_status_idx on public.book_records(status);

-- book_cache: 외부 API 캐시
create table if not exists public.book_cache (
  isbn text primary key,
  title text,
  author text,
  cover_url text,
  description text,
  updated_at timestamptz not null default now()
);

-- RLS 설정
alter table public.profiles enable row level security;
alter table public.book_records enable row level security;
alter table public.class_trees enable row level security;

-- profiles 정책: 본인 조회 가능, 교사는 전체 조회 가능
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles teacher select" on public.profiles;
create policy "profiles teacher select" on public.profiles
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated on public.profiles;
create trigger trg_profiles_set_updated
before update on public.profiles
for each row execute function public.set_updated_at();

-- 신규 가입 시 기본 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', new.email), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- book_records 정책: 본인 insert/select, 교사 select/update
drop policy if exists "records self insert" on public.book_records;
create policy "records self insert" on public.book_records
  for insert with check (user_id = auth.uid());

drop policy if exists "records self select" on public.book_records;
create policy "records self select" on public.book_records
  for select using (user_id = auth.uid());

drop policy if exists "records teacher select" on public.book_records;
create policy "records teacher select" on public.book_records
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

drop policy if exists "records teacher update" on public.book_records;
create policy "records teacher update" on public.book_records
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

-- class_trees 정책: 모두 select, 교사 update
drop policy if exists "class trees select all" on public.class_trees;
create policy "class trees select all" on public.class_trees
  for select using (true);

drop policy if exists "class trees update teacher" on public.class_trees;
create policy "class trees update teacher" on public.class_trees
  for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

-- 승인 + 보상 로직: 승인 시 포인트/잎사귀 지급 및 레벨업 체크
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
begin
  -- 기록 승인 처리
  update public.book_records
    set status = 'approved', approved_at = now()
    where id = p_record_id and status = 'pending'
    returning user_id into v_user_id;

  if not found then
    raise exception 'record not found or not pending';
  end if;

  -- 학생 포인트 +10
  update public.profiles set points = points + 10 where id = v_user_id;

  -- 반 나무는 단일 행 사용 가정: 첫 행에 +1
  -- Supabase에서는 WHERE 절이 필수이므로 서브쿼리 사용
  update public.class_trees 
    set current_leaves = current_leaves + 1
    where id = (select id from public.class_trees order by id limit 1);

  -- 레벨업 체크
  select current_leaves, level_up_target into v_leaves, v_target 
    from public.class_trees 
    order by id limit 1;
  if v_leaves >= v_target then
    update public.class_trees
      set current_level = current_level + 1,
          current_leaves = 0
      where id = (select id from public.class_trees order by id limit 1);
  end if;
end;
$$;

-- 함수 실행 권한
revoke all on function public.approve_record_and_reward(bigint) from public;
grant execute on function public.approve_record_and_reward(bigint) to authenticated;
