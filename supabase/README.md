# Supabase Schema Setup

Run this once for a fresh project, or rerun safely when updating policies.

## Apply schema and policies

1. Open Supabase project dashboard.
2. Go to SQL Editor.
3. Open `/Users/prateekdwivedi/Developer/smart-bookmark/smart-bookmark/supabase/schema.sql`.
4. Copy and execute the script.

## What the script creates

1. `public.bookmarks` table with:
   - `id` (uuid)
   - `title` (text)
   - `url` (text)
   - `user_id` (auth user reference)
   - `created_at` (timestamp)
2. Index on `(user_id, created_at desc)`.
3. Row Level Security policies so users can only:
   - select their own bookmarks
   - insert bookmarks with their own `user_id`
   - delete their own bookmarks
4. Realtime publication registration for `public.bookmarks`.

## Quick verification queries

```sql
select *
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'bookmarks';
```

```sql
select relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'bookmarks';
```

```sql
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'bookmarks'
order by policyname;
```

```sql
select relreplident
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'bookmarks';
```
