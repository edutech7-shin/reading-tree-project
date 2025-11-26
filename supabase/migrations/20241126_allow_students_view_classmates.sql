-- 학생이 같은 반 친구들을 조회할 수 있도록 RLS 정책 추가

-- 같은 반 학생들이 서로의 정보를 조회할 수 있도록 정책 추가
drop policy if exists "class students classmates select" on public.class_students;
create policy "class students classmates select" on public.class_students
  for select using (
    -- 현재 사용자가 학생인 경우
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'student'
    )
    and (
      -- 같은 teacher_id를 가진 학생인지 확인
      exists (
        select 1
        from public.profiles p_current
        join public.class_students cs_current on cs_current.name = p_current.name
        where p_current.id = auth.uid()
          and cs_current.teacher_id = class_students.teacher_id
      )
    )
  );

