create table if not exists public.user_books (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_title text,
  book_author text,
  book_cover_url text,
  book_publisher text,
  book_isbn text,
  book_publication_year text,
  book_total_pages integer,
  status text not null default 'reading', -- 'reading' | 'finished'
  created_at timestamp with time zone default now()
);

create index if not exists user_books_user_id_idx on public.user_books(user_id);
create index if not exists user_books_status_idx on public.user_books(status);
create index if not exists user_books_isbn_idx on public.user_books(book_isbn);

