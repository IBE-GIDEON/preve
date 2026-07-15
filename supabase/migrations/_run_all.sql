-- preve: run all migrations (001-004) in one paste. Idempotent — safe to re-run.

-- ===== 001_profile.sql =====
-- Phase 1: profile fields + avatar storage.
-- Safe to run more than once (idempotent).

-- ── Profile columns ────────────────────────────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists is_public boolean not null default false;

-- Case-insensitive unique username (NULLs allowed until a user picks one).
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- ── Avatar storage bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view avatars (bucket is public).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Users may only write inside a folder named after their own user id:
--   avatars/<uid>/<file>
drop policy if exists "avatars_user_insert" on storage.objects;
create policy "avatars_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- ===== 002_workspace.sql =====
-- Phase 2: personal workspace (collections + search history). Idempotent.

-- ── Collections ─────────────────────────────────────────────────────────────
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  archive_item_id uuid not null references public.archive_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, archive_item_id)
);

-- ── Search history ──────────────────────────────────────────────────────────
create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists collections_user_idx on public.collections (user_id, updated_at desc);
create index if not exists collection_items_collection_idx on public.collection_items (collection_id);
create index if not exists search_history_user_idx on public.search_history (user_id, created_at desc);

-- ── updated_at trigger (function defined in base schema) ─────────────────────
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.search_history enable row level security;

drop policy if exists "collections_owner_all" on public.collections;
create policy "collections_owner_all" on public.collections
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- collection_items are governed by ownership of the parent collection.
drop policy if exists "collection_items_owner_all" on public.collection_items;
create policy "collection_items_owner_all" on public.collection_items
  for all using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "search_history_owner_all" on public.search_history;
create policy "search_history_owner_all" on public.search_history
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ===== 003_community.sql =====
-- Phase 4: community (public profiles, follows, public content). Idempotent.

-- ── Follows ─────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx on public.follows (follower_id);

alter table public.follows enable row level security;

-- The follow graph is public (needed for counts and follow state).
drop policy if exists "follows_public_read" on public.follows;
create policy "follows_public_read" on public.follows for select using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert with check ((select auth.uid()) = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete using ((select auth.uid()) = follower_id);

-- ── Public profile view ─────────────────────────────────────────────────────
-- Exposes ONLY non-sensitive columns of public profiles. Email lives on the
-- base `profiles` table (owner-only RLS) and is deliberately excluded here, so
-- it can never leak through the community surface. The view is security-definer
-- so it can read public rows without a public policy on the base table.
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = off) as
  select id, username, full_name, avatar_url, bio, website, social_links
  from public.profiles
  where is_public = true;

grant select on public.public_profiles to anon, authenticated;

-- ── Public read for shared content ──────────────────────────────────────────
-- A collection the user has explicitly marked public is readable by anyone.
drop policy if exists "collections_public_read" on public.collections;
create policy "collections_public_read" on public.collections
  for select using (is_public = true);

-- Items of a public collection are readable by anyone.
drop policy if exists "collection_items_public_read" on public.collection_items;
create policy "collection_items_public_read" on public.collection_items
  for select using (
    exists (select 1 from public.collections c where c.id = collection_id and c.is_public)
  );

-- An archive item is publicly readable only if it belongs to a public collection.
drop policy if exists "archive_items_public_read" on public.archive_items;
create policy "archive_items_public_read" on public.archive_items
  for select using (
    exists (
      select 1
      from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
      where ci.archive_item_id = archive_items.id and c.is_public
    )
  );

-- ===== 004_connect_platforms.sql =====
-- Phase 3.1: allow connecting any social platform (not just reddit/x/linkedin).
-- Drops the platform CHECK constraint on connected_accounts so the app can
-- offer the full set of platforms. Idempotent.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.connected_accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%platform%'
  loop
    execute format('alter table public.connected_accounts drop constraint %I', c.conname);
  end loop;
end $$;

