-- Storage 버킷 'reading-uploads'에 대한 RLS 정책 설정
-- 모든 인증된 사용자가 자신의 폴더에 파일을 업로드할 수 있고, 모든 사용자가 읽을 수 있도록 설정

-- 읽기 정책: 모든 인증된 사용자가 읽을 수 있음
create policy if not exists "reading-uploads public read"
on storage.objects
for select
using (bucket_id = 'reading-uploads');

-- 업로드 정책: 인증된 사용자가 자신의 폴더(user_id)에만 업로드 가능
create policy if not exists "reading-uploads authenticated upload"
on storage.objects
for insert
with check (
  bucket_id = 'reading-uploads' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 업데이트 정책: 본인이 업로드한 파일만 수정 가능
create policy if not exists "reading-uploads authenticated update"
on storage.objects
for update
using (
  bucket_id = 'reading-uploads' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 삭제 정책: 본인이 업로드한 파일만 삭제 가능
create policy if not exists "reading-uploads authenticated delete"
on storage.objects
for delete
using (
  bucket_id = 'reading-uploads' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

