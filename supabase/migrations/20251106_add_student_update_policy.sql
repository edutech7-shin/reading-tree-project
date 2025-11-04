-- 학생이 자신의 기록을 수정할 수 있도록 RLS 정책 추가
-- 승인 대기 중이거나 반려된 기록만 수정 가능

drop policy if exists "records self update" on public.book_records;
create policy "records self update" on public.book_records
  for update 
  using (
    user_id = auth.uid() 
    and status in ('pending', 'rejected')
  )
  with check (
    user_id = auth.uid() 
    and status in ('pending', 'rejected')
  );

