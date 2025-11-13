create extension if not exists "pgcrypto";

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_number integer not null,
  name text not null,
  avatar_type text not null default 'rookie',
  level integer not null default 1 check (level >= 1),
  leaves integer not null default 0 check (leaves >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_number)
);

alter table public.class_students enable row level security;

create index if not exists class_students_teacher_id_idx on public.class_students(teacher_id);
create index if not exists class_students_number_idx on public.class_students(teacher_id, student_number);

drop trigger if exists trg_class_students_set_updated on public.class_students;
create trigger trg_class_students_set_updated
before update on public.class_students
for each row execute function public.set_updated_at();

drop policy if exists "class students teacher select" on public.class_students;
create policy "class students teacher select" on public.class_students
  for select using (auth.uid() = teacher_id);

drop policy if exists "class students teacher insert" on public.class_students;
create policy "class students teacher insert" on public.class_students
  for insert with check (auth.uid() = teacher_id);

drop policy if exists "class students teacher update" on public.class_students;
create policy "class students teacher update" on public.class_students
  for update using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

drop policy if exists "class students teacher delete" on public.class_students;
create policy "class students teacher delete" on public.class_students
  for delete using (auth.uid() = teacher_id);

