-- Administrator policies for the existing Supabase Auth account.
-- Keep this email synchronized with VITE_ADMIN_EMAIL.
-- This migration does not change public read or anonymous insert/upload policies.

-- Remove the previous function-based policies so the policy condition is explicit.
drop policy if exists "admin can update books" on public.books;
drop policy if exists "admin can delete books" on public.books;
drop policy if exists "admin can delete book pages" on public.book_pages;
drop policy if exists "admin can delete book page files" on storage.objects;

create policy "admin can update books"
on public.books
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'wpgus5317@naver.com')
with check ((auth.jwt() ->> 'email') = 'wpgus5317@naver.com');

create policy "admin can delete books"
on public.books
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'wpgus5317@naver.com');

-- The application relies on books.book_pages ON DELETE CASCADE.
-- This policy also permits an explicit administrator-only page delete if needed.
create policy "admin can delete book pages"
on public.book_pages
for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'wpgus5317@naver.com');

create policy "admin can delete book page files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'book-pages'
  and (auth.jwt() ->> 'email') = 'wpgus5317@naver.com'
);
