-- Smart Bookmark schema and security policies
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bookmarks_title_length check (char_length(trim(title)) between 1 and 200),
  constraint bookmarks_url_length check (char_length(trim(url)) between 1 and 2048)
);

create index if not exists bookmarks_user_id_created_at_idx
  on public.bookmarks (user_id, created_at desc);

alter table public.bookmarks enable row level security;
alter table public.bookmarks replica identity full;

grant usage on schema public to authenticated, anon;
grant select, insert, delete on table public.bookmarks to authenticated;

drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own"
  on public.bookmarks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own"
  on public.bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own"
  on public.bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime add table public.bookmarks;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
