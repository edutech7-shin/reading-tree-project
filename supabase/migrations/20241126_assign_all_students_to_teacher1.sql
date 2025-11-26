-- 모든 학생을 teacher1 반에 소속시키기
-- teacher1의 user_id를 찾아서 모든 class_students의 teacher_id를 업데이트

do $$
declare
  v_teacher1_id uuid;
  v_updated_count integer;
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

  -- 모든 class_students의 teacher_id를 teacher1의 user_id로 업데이트
  update public.class_students
  set teacher_id = v_teacher1_id
  where teacher_id != v_teacher1_id;

  get diagnostics v_updated_count = row_count;

  raise notice '모든 학생이 teacher1 반에 소속되었습니다. (teacher_id: %, 업데이트된 학생 수: %)', v_teacher1_id, v_updated_count;
end $$;


