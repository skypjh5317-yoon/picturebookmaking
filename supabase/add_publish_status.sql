-- Add publication state without changing existing books.
alter table public.books
  add column if not exists is_published boolean default true;

update public.books
set is_published = true
where is_published is null;

alter table public.books
  alter column is_published set default true,
  alter column is_published set not null;

-- Keep this email in sync with VITE_ADMIN_EMAIL.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'email') = 'wpgus5317@naver.com', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin can update books" on public.books;
create policy "admin can update books"
on public.books
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin can delete books" on public.books;
create policy "admin can delete books"
on public.books
for delete
to authenticated
using (public.is_admin());

drop policy if exists "admin can delete book pages" on public.book_pages;
create policy "admin can delete book pages"
on public.book_pages
for delete
to authenticated
using (public.is_admin());

drop policy if exists "admin can delete book page files" on storage.objects;
create policy "admin can delete book page files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'book-pages' and public.is_admin());
