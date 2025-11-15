-- book_records 테이블에 출판사, ISBN, 출판일, 전체 페이지 수 컬럼 추가

alter table public.book_records
  add column if not exists book_publisher text,
  add column if not exists book_isbn text,
  add column if not exists book_publication_date date,
  add column if not exists book_total_pages integer;

-- ISBN 인덱스 추가 (검색 성능 향상)
create index if not exists book_records_isbn_idx on public.book_records(book_isbn) where book_isbn is not null;

-- 코멘트 추가
comment on column public.book_records.book_publisher is '출판사명';
comment on column public.book_records.book_isbn is 'ISBN-13 또는 ISBN-10';
comment on column public.book_records.book_publication_date is '출판일';
comment on column public.book_records.book_total_pages is '전체 페이지 수';

