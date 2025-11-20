-- book_records 테이블에 별점 컬럼 추가
alter table public.book_records
  add column if not exists rating integer check (rating >= 1 and rating <= 5);

comment on column public.book_records.rating is '사용자가 부여한 별점 (1-5)';

