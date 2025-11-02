begin;

create or replace function public.is_teacher(p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_uid
      and role = 'teacher'
  );
$$;

revoke all on function public.is_teacher(uuid) from public;
grant execute on function public.is_teacher(uuid) to authenticated;

drop policy if exists "profiles teacher select" on public.profiles;
create policy "profiles teacher select" on public.profiles
  for select
  using (public.is_teacher(auth.uid()));

commit;
