-- 교사 추천 도서 테이블 생성
create table if not exists public.teacher_recommended_books (
  id bigserial primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  book_title text not null,
  book_author text,
  book_cover_url text,
  book_isbn text,
  book_publisher text,
  book_publication_year text,
  book_total_pages integer,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_recommended_books_teacher_id_idx on public.teacher_recommended_books(teacher_id);
create index if not exists teacher_recommended_books_display_order_idx on public.teacher_recommended_books(display_order);

-- 어린이 인기 도서 테이블 생성 (전역 데이터)
create table if not exists public.popular_children_books (
  id bigserial primary key,
  book_title text not null,
  book_author text,
  book_cover_url text,
  book_isbn text,
  book_publisher text,
  book_publication_year text,
  book_total_pages integer,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists popular_children_books_display_order_idx on public.popular_children_books(display_order);

-- RLS 설정
alter table public.teacher_recommended_books enable row level security;
alter table public.popular_children_books enable row level security;

-- teacher_recommended_books 정책
-- 모든 사용자는 추천 도서를 조회할 수 있음 (학생도 볼 수 있도록)
drop policy if exists "teacher_recommended_books all select" on public.teacher_recommended_books;
create policy "teacher_recommended_books all select" on public.teacher_recommended_books
  for select using (true);

-- 교사는 자신의 추천 도서를 추가/수정/삭제할 수 있음
drop policy if exists "teacher_recommended_books teacher insert" on public.teacher_recommended_books;
create policy "teacher_recommended_books teacher insert" on public.teacher_recommended_books
  for insert with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

drop policy if exists "teacher_recommended_books teacher update" on public.teacher_recommended_books;
create policy "teacher_recommended_books teacher update" on public.teacher_recommended_books
  for update using (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

drop policy if exists "teacher_recommended_books teacher delete" on public.teacher_recommended_books;
create policy "teacher_recommended_books teacher delete" on public.teacher_recommended_books
  for delete using (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- popular_children_books 정책
-- 모든 사용자는 인기 도서를 조회할 수 있음
drop policy if exists "popular_children_books all select" on public.popular_children_books;
create policy "popular_children_books all select" on public.popular_children_books
  for select using (true);

-- 교사는 인기 도서를 관리할 수 있음
drop policy if exists "popular_children_books teacher manage" on public.popular_children_books;
create policy "popular_children_books teacher manage" on public.popular_children_books
  for all using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'teacher'
    )
  );

-- updated_at 자동 갱신 트리거
create or replace function public.set_recommended_books_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teacher_recommended_books_set_updated on public.teacher_recommended_books;
create trigger trg_teacher_recommended_books_set_updated
  before update on public.teacher_recommended_books
  for each row
  execute function public.set_recommended_books_updated_at();

drop trigger if exists trg_popular_children_books_set_updated on public.popular_children_books;
create trigger trg_popular_children_books_set_updated
  before update on public.popular_children_books
  for each row
  execute function public.set_recommended_books_updated_at();

-- 어린이 인기 도서 샘플 데이터 추가 (5권)
INSERT INTO public.popular_children_books (book_title, book_author, book_cover_url, book_isbn, book_publisher, display_order)
VALUES
  ('해리포터와 마법사의 돌', 'J.K. 롤링', null, '9788983927927', '문학수첩', 1),
  ('찰리와 초콜릿 공장', '로알드 달', null, '9788936444258', '문학동네', 2),
  ('마틸다', '로알드 달', null, '9788936444241', '문학동네', 3),
  ('꼬마 니콜라', '르네 고시니', null, '9788952208901', '주니어김영사', 4),
  ('톰 소여의 모험', '마크 트웨인', null, '9788952208902', '주니어김영사', 5)
ON CONFLICT DO NOTHING;
