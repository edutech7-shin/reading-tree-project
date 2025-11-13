do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'nickname'
  ) then
    alter table public.profiles
      rename column nickname to name;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nickname', new.email),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'teacher'),
    case
      when coalesce(new.raw_user_meta_data->>'role', '') = 'admin' then 'active'
      else 'pending'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

