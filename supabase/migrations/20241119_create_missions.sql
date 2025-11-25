-- 미션 시스템 테이블 생성
-- 독서 습관 형성을 위한 교사-학생 미션 관리 시스템

-- 1. missions 테이블: 미션 템플릿 (교사가 생성)
create table if not exists public.missions (
  id bigserial primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('book_reading', 'general')),
  verification_method text not null check (verification_method in ('self', 'teacher')),
  -- 책 읽기 미션일 때 사용
  book_id bigint references public.user_books(id) on delete set null,
  book_title text,
  book_author text,
  book_isbn text,
  -- 일반 미션일 때 사용
  mission_content text,
  -- 보상 설정
  points integer not null default 5 check (points > 0),
  -- 메타데이터
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- 2. mission_assignments 테이블: 학생에게 할당된 미션
create table if not exists public.mission_assignments (
  id bigserial primary key,
  mission_id bigint not null references public.missions(id) on delete cascade,
  student_id uuid not null references public.class_students(id) on delete cascade,
  -- 기간 설정
  start_date date not null,
  end_date date, -- null이면 기한 없음
  -- 상태 관리
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  -- 타임스탬프
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  -- 중복 할당 방지
  unique (mission_id, student_id)
);

-- 3. mission_completions 테이블: 미션 완료 기록
create table if not exists public.mission_completions (
  id bigserial primary key,
  assignment_id bigint not null references public.mission_assignments(id) on delete cascade,
  student_id uuid not null references public.class_students(id) on delete cascade,
  -- 확인 정보
  verified_by text not null check (verified_by in ('self', 'teacher')),
  teacher_id uuid references public.profiles(id) on delete set null, -- 교사 확인일 때
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  -- 완료 증빙 (선택사항)
  proof_text text,
  proof_image_url text,
  -- 교사 코멘트
  teacher_comment text,
  -- 타임스탬프
  completed_at timestamptz not null default now(),
  verified_at timestamptz,
  -- 포인트 지급 여부
  points_awarded integer default 0
);

-- 인덱스 생성
create index if not exists missions_teacher_id_idx on public.missions(teacher_id);
create index if not exists missions_type_idx on public.missions(type);
create index if not exists missions_is_active_idx on public.missions(is_active);

create index if not exists mission_assignments_mission_id_idx on public.mission_assignments(mission_id);
create index if not exists mission_assignments_student_id_idx on public.mission_assignments(student_id);
create index if not exists mission_assignments_status_idx on public.mission_assignments(status);
create index if not exists mission_assignments_end_date_idx on public.mission_assignments(end_date);

create index if not exists mission_completions_assignment_id_idx on public.mission_completions(assignment_id);
create index if not exists mission_completions_student_id_idx on public.mission_completions(student_id);
create index if not exists mission_completions_verification_status_idx on public.mission_completions(verification_status);

-- RLS 활성화
alter table public.missions enable row level security;
alter table public.mission_assignments enable row level security;
alter table public.mission_completions enable row level security;

-- missions RLS 정책
-- 교사는 자신이 생성한 미션만 조회/수정/삭제 가능
drop policy if exists "missions teacher select" on public.missions;
create policy "missions teacher select" on public.missions
  for select using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'teacher' 
      and p.id = public.missions.teacher_id
    )
  );

drop policy if exists "missions teacher insert" on public.missions;
create policy "missions teacher insert" on public.missions
  for insert with check (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'teacher' 
      and p.id = public.missions.teacher_id
    )
  );

drop policy if exists "missions teacher update" on public.missions;
create policy "missions teacher update" on public.missions
  for update using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'teacher' 
      and p.id = public.missions.teacher_id
    )
  ) with check (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'teacher' 
      and p.id = public.missions.teacher_id
    )
  );

drop policy if exists "missions teacher delete" on public.missions;
create policy "missions teacher delete" on public.missions
  for delete using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'teacher' 
      and p.id = public.missions.teacher_id
    )
  );

-- 학생은 자신의 교사가 생성한 미션 조회 가능 (할당 전에도 볼 수 있도록)
drop policy if exists "missions student select" on public.missions;
create policy "missions student select" on public.missions
  for select using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = auth.uid()
      where p.role = 'student'
      and p.name = cs.name
      and cs.teacher_id = public.missions.teacher_id
    )
  );

-- mission_assignments RLS 정책
-- 교사는 자신의 학생들에게 할당된 미션 조회/수정 가능
drop policy if exists "mission_assignments teacher select" on public.mission_assignments;
create policy "mission_assignments teacher select" on public.mission_assignments
  for select using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_assignments.student_id
    )
  );

drop policy if exists "mission_assignments teacher insert" on public.mission_assignments;
create policy "mission_assignments teacher insert" on public.mission_assignments
  for insert with check (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_assignments.student_id
    )
  );

drop policy if exists "mission_assignments teacher update" on public.mission_assignments;
create policy "mission_assignments teacher update" on public.mission_assignments
  for update using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_assignments.student_id
    )
  ) with check (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_assignments.student_id
    )
  );

-- 학생은 자신에게 할당된 미션만 조회 가능
-- class_students의 name과 profiles의 name을 매칭하여 확인
drop policy if exists "mission_assignments student select" on public.mission_assignments;
create policy "mission_assignments student select" on public.mission_assignments
  for select using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = auth.uid()
      where cs.id = mission_assignments.student_id
      and p.role = 'student'
      and p.name = cs.name
    )
  );

-- mission_completions RLS 정책
-- 교사는 자신의 학생들의 완료 기록 조회/수정 가능
drop policy if exists "mission_completions teacher select" on public.mission_completions;
create policy "mission_completions teacher select" on public.mission_completions
  for select using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_completions.student_id
    )
  );

drop policy if exists "mission_completions teacher update" on public.mission_completions;
create policy "mission_completions teacher update" on public.mission_completions
  for update using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_completions.student_id
    )
  ) with check (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = cs.teacher_id
      where p.id = auth.uid() 
      and p.role = 'teacher'
      and cs.id = mission_completions.student_id
    )
  );

-- 학생은 자신의 완료 기록 조회/생성 가능
drop policy if exists "mission_completions student select" on public.mission_completions;
create policy "mission_completions student select" on public.mission_completions
  for select using (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = auth.uid()
      where cs.id = mission_completions.student_id
      and p.role = 'student'
      and p.name = cs.name
    )
  );

drop policy if exists "mission_completions student insert" on public.mission_completions;
create policy "mission_completions student insert" on public.mission_completions
  for insert with check (
    exists (
      select 1 from public.class_students cs
      join public.profiles p on p.id = auth.uid()
      where cs.id = mission_completions.student_id
      and p.role = 'student'
      and p.name = cs.name
    )
  );

-- updated_at 자동 갱신 트리거
drop trigger if exists trg_missions_set_updated on public.missions;
create trigger trg_missions_set_updated
before update on public.missions
for each row execute function public.set_updated_at();

-- 미션 완료 시 포인트 지급 함수
create or replace function public.complete_mission_and_reward(
  p_assignment_id bigint,
  p_verification_method text default 'self'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_mission_id bigint;
  v_points integer;
  v_verification_method text;
  v_user_id uuid;
  v_mission_title text;
  v_class_student_id uuid;
  v_student_name text;
begin
  -- 할당 정보 가져오기
  select 
    ma.student_id,
    ma.mission_id,
    m.points,
    m.verification_method,
    m.title,
    cs.name
  into 
    v_class_student_id,
    v_mission_id,
    v_points,
    v_verification_method,
    v_mission_title,
    v_student_name
  from public.mission_assignments ma
  join public.missions m on m.id = ma.mission_id
  join public.class_students cs on cs.id = ma.student_id
  where ma.id = p_assignment_id
    and ma.status = 'active';
  
  if not found then
    raise exception 'assignment not found or not active';
  end if;
  
  -- class_students의 name으로 profiles에서 user_id 찾기
  select id into v_user_id
  from public.profiles
  where name = v_student_name
    and role = 'student'
  limit 1;
  
  -- 자율 확인 방식이면 즉시 포인트 지급
  if v_verification_method = 'self' or p_verification_method = 'self' then
    -- 완료 기록 생성
    insert into public.mission_completions (
      assignment_id,
      student_id,
      verified_by,
      verification_status,
      points_awarded,
      completed_at,
      verified_at
    ) values (
      p_assignment_id,
      v_class_student_id,
      'self',
      'approved',
      v_points,
      now(),
      now()
    );
    
    -- 할당 상태 업데이트
    update public.mission_assignments
    set status = 'completed',
        completed_at = now()
    where id = p_assignment_id;
    
    -- 포인트 지급 (profiles 테이블에 직접 지급)
    if v_user_id is not null then
      update public.profiles 
      set points = points + v_points 
      where id = v_user_id;
      
      -- 알림 생성
      perform public.create_notification(
        v_user_id,
        'approval',
        '✅ 미션을 완료했어요!',
        format('"%s" 미션을 완료하여 물방울 %s점을 받았어요!', v_mission_title, v_points),
        null
      );
    end if;
  else
    -- 교사 확인 방식이면 대기 상태로 생성
    insert into public.mission_completions (
      assignment_id,
      student_id,
      verified_by,
      verification_status,
      completed_at
    ) values (
      p_assignment_id,
      v_class_student_id,
      'teacher',
      'pending',
      now()
    );
    
    -- 교사에게 알림 (선택사항)
    -- perform public.create_notification(...);
  end if;
end;
$$;

-- 교사가 미션 완료 승인하는 함수
create or replace function public.approve_mission_completion(
  p_completion_id bigint,
  p_teacher_id uuid,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id bigint;
  v_student_id uuid;
  v_points integer;
  v_mission_title text;
  v_student_name text;
  v_user_id uuid;
begin
  -- 완료 기록 정보 가져오기
  select 
    mc.assignment_id,
    mc.student_id,
    m.points,
    m.title,
    cs.name
  into 
    v_assignment_id,
    v_student_id,
    v_points,
    v_mission_title,
    v_student_name
  from public.mission_completions mc
  join public.mission_assignments ma on ma.id = mc.assignment_id
  join public.missions m on m.id = ma.mission_id
  join public.class_students cs on cs.id = mc.student_id
  where mc.id = p_completion_id
    and mc.verification_status = 'pending';
  
  if not found then
    raise exception 'completion not found or not pending';
  end if;
  
  -- 승인 처리
  update public.mission_completions
  set verification_status = 'approved',
      teacher_id = p_teacher_id,
      teacher_comment = p_comment,
      verified_at = now(),
      points_awarded = v_points
  where id = p_completion_id;
  
  -- 할당 상태 업데이트
  update public.mission_assignments
  set status = 'completed',
      completed_at = now()
  where id = v_assignment_id;
  
  -- class_students의 name으로 profiles에서 user_id 찾기
  select id into v_user_id
  from public.profiles
  where name = v_student_name
    and role = 'student'
  limit 1;
  
  -- 포인트 지급
  if v_user_id is not null then
    update public.profiles 
    set points = points + v_points 
    where id = v_user_id;
    
    -- 알림 생성
    perform public.create_notification(
      v_user_id,
      'approval',
      '✅ 미션이 승인되었어요!',
      format('"%s" 미션이 승인되어 물방울 %s점을 받았어요!', v_mission_title, v_points),
      null
    );
  end if;
end;
$$;

-- 만료된 미션 자동 업데이트 함수 (스케줄러에서 호출)
create or replace function public.expire_old_missions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.mission_assignments
  set status = 'expired'
  where status = 'active'
    and end_date is not null
    and end_date < current_date;
  
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 함수 실행 권한
revoke all on function public.complete_mission_and_reward(bigint, text) from public;
grant execute on function public.complete_mission_and_reward(bigint, text) to authenticated;

revoke all on function public.approve_mission_completion(bigint, uuid, text) from public;
grant execute on function public.approve_mission_completion(bigint, uuid, text) to authenticated;

revoke all on function public.expire_old_missions() from public;
grant execute on function public.expire_old_missions() to authenticated;

