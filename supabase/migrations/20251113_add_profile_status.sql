alter table public.profiles
  add column if not exists status text not null default 'pending'
  check (status in ('pending', 'active', 'suspended'));

update public.profiles
set status = 'active'
where status is null or status = '' or status = 'pending';

