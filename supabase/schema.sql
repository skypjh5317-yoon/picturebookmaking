create extension if not exists pgcrypto;

-- ==========================================
-- 1. Books table
-- ==========================================

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text not null default '',
  grade text not null default '',
  class_name text not null default '',
  school text not null default '',
  year integer not null,
  cover_image_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================
-- 2. Book pages table
-- ==========================================

create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  page_number integer not null,
  image_path text not null,
  image_url text not null,
  original_filename text not null,
  created_at timestamptz not null default now(),
  unique (book_id, page_number)
);

-- ==========================================
-- 3. Enable Row Level Security
-- ==========================================

alter table public.books enable row level security;
alter table public.book_pages enable row level security;

-- ==========================================
-- 4. Books policies
-- ==========================================

drop policy if exists "public can read books"
on public.books;

create policy "public can read books"
on public.books
for select
using (true);

drop policy if exists "anonymous can create books"
on public.books;

create policy "anonymous can create books"
on public.books
for insert
with check (true);

-- ==========================================
-- 5. Book pages policies
-- ==========================================

drop policy if exists "public can read book pages"
on public.book_pages;

create policy "public can read book pages"
on public.book_pages
for select
using (true);

drop policy if exists "anonymous can create book pages"
on public.book_pages;

create policy "anonymous can create book pages"
on public.book_pages
for insert
with check (true);

-- ==========================================
-- 6. Admin policies
-- ==========================================

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
on public.books for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin can delete books" on public.books;
create policy "admin can delete books"
on public.books for delete to authenticated
using (public.is_admin());

drop policy if exists "admin can delete book pages" on public.book_pages;
create policy "admin can delete book pages"
on public.book_pages for delete to authenticated
using (public.is_admin());

-- ==========================================
-- 7. Storage bucket
-- ==========================================

insert into storage.buckets (id, name, public)
values ('book-pages', 'book-pages', true)
on conflict (id)
do update set public = true;

-- ==========================================
-- 8. Storage policies
-- ==========================================

drop policy if exists "public can read book page files"
on storage.objects;

create policy "public can read book page files"
on storage.objects
for select
using (bucket_id = 'book-pages');

drop policy if exists "anonymous can upload book page files"
on storage.objects;

create policy "anonymous can upload book page files"
on storage.objects
for insert
with check (bucket_id = 'book-pages');

drop policy if exists "admin can delete book page files"
on storage.objects;

create policy "admin can delete book page files"
on storage.objects
for delete to authenticated
using (bucket_id = 'book-pages' and public.is_admin());