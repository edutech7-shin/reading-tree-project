-- Enable RLS on book_cache table
alter table public.book_cache enable row level security;

-- Allow all authenticated users to read book cache
drop policy if exists "book_cache select all" on public.book_cache;
create policy "book_cache select all" on public.book_cache
  for select using (true);

-- Allow authenticated users to insert/update book cache (for caching purposes)
drop policy if exists "book_cache insert authenticated" on public.book_cache;
create policy "book_cache insert authenticated" on public.book_cache
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "book_cache update authenticated" on public.book_cache;
create policy "book_cache update authenticated" on public.book_cache
  for update using (auth.role() = 'authenticated');
