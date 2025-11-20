-- book_records 테이블에 작성 날짜와 한 줄 소감 컬럼 추가
alter table public.book_records
  add column if not exists record_date date,
  add column if not exists short_comment text;

comment on column public.book_records.record_date is '독서록 작성 날짜 (YYYY-MM-DD)';
comment on column public.book_records.short_comment is '한 줄 소감';

