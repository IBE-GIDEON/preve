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
