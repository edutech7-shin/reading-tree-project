-- 같은 반 학생들이 서로의 다 읽은 책(user_books)을 볼 수 있도록 RLS 정책 추가

drop policy if exists "user_books classmates select finished" on public.user_books;
create policy "user_books classmates select finished" on public.user_books
  for select using (
    -- 다 읽은 책만
    status = 'finished'
    and (
      -- 같은 반 학생인지 확인
      exists (
        select 1
        from public.profiles p_current
        join public.class_students cs_current on cs_current.name = p_current.name
        join public.profiles p_book on p_book.id = user_books.user_id
        join public.class_students cs_book on cs_book.name = p_book.name
        where p_current.id = auth.uid()
          and p_current.role = 'student'
          and p_book.role = 'student'
          and cs_current.teacher_id = cs_book.teacher_id
      )
    )
  );

