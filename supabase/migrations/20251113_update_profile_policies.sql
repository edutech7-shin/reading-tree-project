-- Reset existing profiles policies and recreate with admin/teacher support

drop policy if exists "profiles self select" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin select" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
drop policy if exists "profiles teacher select" on public.profiles;
drop policy if exists "profiles teacher update" on public.profiles;

create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles admin select" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  );

create policy "profiles admin update" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    )
  );

create policy "profiles teacher select" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
        and p.status = 'active'
    )
  );

create policy "profiles teacher update" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
        and p.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher', 'admin')
        and p.status = 'active'
    )
  );

