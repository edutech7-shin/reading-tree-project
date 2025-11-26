-- 같은 반 학생들이 서로의 승인된 활동을 볼 수 있도록 RLS 정책 추가

-- 1. book_records: 같은 반 학생들이 승인된 독서 기록을 볼 수 있도록 정책 추가
drop policy if exists "records classmates select approved" on public.book_records;
create policy "records classmates select approved" on public.book_records
  for select using (
    -- 승인된 기록만
    status = 'approved'
    and (
      -- 같은 반 학생인지 확인
      exists (
        select 1
        from public.profiles p_current
        join public.class_students cs_current on cs_current.name = p_current.name
        join public.profiles p_record on p_record.id = book_records.user_id
        join public.class_students cs_record on cs_record.name = p_record.name
        where p_current.id = auth.uid()
          and p_current.role = 'student'
          and p_record.role = 'student'
          and cs_current.teacher_id = cs_record.teacher_id
      )
    )
  );

-- 2. mission_completions: 같은 반 학생들이 승인된 미션 완료 기록을 볼 수 있도록 정책 추가
drop policy if exists "mission_completions classmates select approved" on public.mission_completions;
create policy "mission_completions classmates select approved" on public.mission_completions
  for select using (
    -- 승인된 완료 기록만
    verification_status = 'approved'
    and (
      -- 같은 반 학생인지 확인
      exists (
        select 1
        from public.profiles p_current
        join public.class_students cs_current on cs_current.name = p_current.name
        join public.class_students cs_completion on cs_completion.id = mission_completions.student_id
        where p_current.id = auth.uid()
          and p_current.role = 'student'
          and cs_current.teacher_id = cs_completion.teacher_id
      )
    )
  );

