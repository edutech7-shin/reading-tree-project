-- teacher1을 제외한 나머지 교사 계정 삭제
-- teacher1의 user_id를 찾아서 나머지 교사 계정들을 auth.users에서 삭제

do $$
declare
  v_teacher1_id uuid;
  v_deleted_count integer := 0;
  v_teacher_record record;
begin
  -- teacher1의 user_id 찾기
  -- 1순위: 이메일에 'teacher1'이 포함된 교사
  -- 2순위: 이메일에 'teacher'이 포함된 교사 중 첫 번째
  -- 3순위: role='teacher'인 사용자 중 첫 번째
  select p.id into v_teacher1_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'teacher'
    and (
      u.email ilike '%teacher1%'
      or u.email ilike '%teacher%'
    )
  order by 
    case when u.email ilike '%teacher1%' then 1 else 2 end,
    p.created_at
  limit 1;

  -- teacher1을 찾지 못한 경우, role='teacher'인 첫 번째 사용자 사용
  if v_teacher1_id is null then
    select id into v_teacher1_id
    from public.profiles
    where role = 'teacher'
    order by created_at
    limit 1;
  end if;

  -- teacher1을 찾지 못한 경우 에러
  if v_teacher1_id is null then
    raise exception 'teacher1을 찾을 수 없습니다. 교사 계정이 생성되어 있는지 확인해주세요.';
  end if;

  raise notice 'teacher1 ID: %', v_teacher1_id;

  -- teacher1을 제외한 모든 교사 계정 삭제
  -- auth.users에서 삭제하면 CASCADE로 profiles도 자동 삭제됨
  for v_teacher_record in
    select u.id, u.email
    from auth.users u
    join public.profiles p on p.id = u.id
    where p.role = 'teacher'
      and u.id != v_teacher1_id
  loop
    -- auth.users에서 삭제 (CASCADE로 profiles도 자동 삭제)
    delete from auth.users
    where id = v_teacher_record.id;
    
    v_deleted_count := v_deleted_count + 1;
    raise notice '교사 계정 삭제: % (%)', v_teacher_record.email, v_teacher_record.id;
  end loop;

  raise notice 'teacher1을 제외한 교사 계정 %개가 삭제되었습니다.', v_deleted_count;
end $$;

