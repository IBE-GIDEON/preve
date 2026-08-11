-- ============================================================================
-- preve — complete database setup for the B2B procurement app.
--
-- Paste this whole file into the Supabase SQL editor and run it once. It is
-- idempotent, so re-running is safe.
--
-- This is everything the CURRENT app needs: people (profiles), the
-- organizations they register (companies), and the match runs the AI produces
-- (match_requests). The creator-era tables from the old product
-- (connected_accounts, import_jobs, archive_items, archive_embeddings,
-- saved_archive_items) are NOT created here — nothing in the app reads them
-- any more. They are left untouched if they already exist in your project;
-- drop them by hand once you are sure you want the data gone.
-- ============================================================================

create extension if not exists pgcrypto;

-- Answers "is this company URL free?" without exposing rows. companies RLS is
-- owner-scoped, so a direct query would report every taken slug as available.
-- Defined after the companies table below; see company_slug_available().

-- ── Shared helpers ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── People ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Mirror every new auth user into profiles so the app always has a row to read.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Organizations ───────────────────────────────────────────────────────────
-- The company profile is what the matching engine qualifies a need against,
-- so most columns exist to make the AI's reasoning more specific.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  website text,
  tagline text,
  description text,
  industry text,
  size text,
  org_type text,
  headquarters text,
  markets text[] not null default '{}',
  specialties text[] not null default '{}',
  founded_year integer,
  logo_url text,
  verified_representative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists companies_slug_unique on public.companies (lower(slug));
create index if not exists companies_owner_idx on public.companies (owner_id, created_at desc);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- Runs as the definer so the registration form can be told the truth about a
-- slug it is not allowed to see the owner of.
create or replace function public.company_slug_available(candidate text, exclude_id uuid default null)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.companies
    where lower(slug) = lower(candidate)
      and (exclude_id is null or id <> exclude_id)
  );
$$;

revoke all on function public.company_slug_available(text, uuid) from public;
grant execute on function public.company_slug_available(text, uuid) to authenticated;

-- ── Match runs ──────────────────────────────────────────────────────────────
-- Kept so a buyer can revisit the reasoning behind a procurement decision.
create table if not exists public.match_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  need text not null,
  qualification jsonb not null default '{}'::jsonb,
  providers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_requests_company_idx
  on public.match_requests (company_id, created_at desc);

-- ── Row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.match_requests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "companies_owner_all" on public.companies;
create policy "companies_owner_all" on public.companies
  for all using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "match_requests_owner_all" on public.match_requests;
create policy "match_requests_owner_all" on public.match_requests
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Storage: avatars (people) and company logos ─────────────────────────────
-- Size and type caps belong on the bucket, not just in the upload form: the
-- storage API is callable directly by any signed-in user, so browser-side
-- validation alone would leave a public, unbounded file host on this domain.
-- SVG is deliberately excluded — a public bucket serves it back with any script
-- inside it intact. `do update` because on conflict-do-nothing would silently
-- skip retrofitting a bucket that already exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 4194304, array['image/png', 'image/jpeg', 'image/webp']),
  ('company-logos', 'company-logos', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_user_write" on storage.objects;
create policy "avatars_user_write" on storage.objects
  for all using (
    bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "company_logos_public_read" on storage.objects;
create policy "company_logos_public_read" on storage.objects
  for select using (bucket_id = 'company-logos');

-- Writes are confined to a folder named after the user's own id, so one user
-- can never overwrite another's logo: company-logos/<uid>/<file>
drop policy if exists "company_logos_user_write" on storage.objects;
create policy "company_logos_user_write" on storage.objects
  for all using (
    bucket_id = 'company-logos' and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'company-logos' and (select auth.uid())::text = (storage.foldername(name))[1]
  );
