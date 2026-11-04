-- 그림책 배경음악 기능: 책에 음악 정보를 저장하고, 음악 파일 전용 저장소를 만듭니다.
-- 기존 그림책에는 아무 영향이 없습니다(새 칸은 비어 있는 상태로 추가됨).

alter table public.books
  add column if not exists music_preset text,
  add column if not exists music_url text,
  add column if not exists music_path text,
  add column if not exists music_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-music', 'book-music', true, 10485760,
  array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/wave','audio/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read book music files" on storage.objects;
create policy "public can read book music files" on storage.objects
  for select using (bucket_id = 'book-music');

drop policy if exists "public maker can upload book music files" on storage.objects;
create policy "public maker can upload book music files" on storage.objects
  for insert with check (bucket_id = 'book-music');

drop policy if exists "library admins can delete book music files" on storage.objects;
create policy "library admins can delete book music files" on storage.objects
  for delete using (bucket_id = 'book-music' and (select private.is_library_admin()));
