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
