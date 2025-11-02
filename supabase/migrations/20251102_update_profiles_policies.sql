begin;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles teacher select" on public.profiles;
create policy "profiles teacher select" on public.profiles
  for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher');

commit;
