create extension if not exists "pgcrypto";

alter table public.class_students
  add column if not exists experience integer not null default 0 check (experience >= 0),
  add column if not exists coins integer not null default 0 check (coins >= 0),
  add column if not exists gems integer not null default 0 check (gems >= 0);

create table if not exists public.class_student_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.class_students(id) on delete cascade,
  kind text not null,
  title text not null,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.class_student_activities enable row level security;

create index if not exists class_student_activities_student_id_idx
  on public.class_student_activities(student_id, created_at desc);

drop policy if exists "class student activities teacher select" on public.class_student_activities;
create policy "class student activities teacher select" on public.class_student_activities
  for select using (
    exists (
      select 1
      from public.class_students cs
      where cs.id = student_id
        and cs.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "class student activities teacher insert" on public.class_student_activities;
create policy "class student activities teacher insert" on public.class_student_activities
  for insert with check (
    exists (
      select 1
      from public.class_students cs
      where cs.id = student_id
        and cs.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "class student activities teacher update" on public.class_student_activities;
create policy "class student activities teacher update" on public.class_student_activities
  for update using (
    exists (
      select 1
      from public.class_students cs
      where cs.id = student_id
        and cs.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  ) with check (
    exists (
      select 1
      from public.class_students cs
      where cs.id = student_id
        and cs.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists "class student activities teacher delete" on public.class_student_activities;
create policy "class student activities teacher delete" on public.class_student_activities
  for delete using (
    exists (
      select 1
      from public.class_students cs
      where cs.id = student_id
        and cs.teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

