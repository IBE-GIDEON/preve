-- Phase 7: the B2B pivot. Companies become the primary object in preve —
-- a user registers an organization, and the matching engine qualifies that
-- organization's needs against providers.
-- Safe to run more than once (idempotent).

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
  -- LinkedIn requires the creator to affirm they may act for the organization.
  verified_representative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique public URL: preve.app/company/<slug>
create unique index if not exists companies_slug_unique on public.companies (lower(slug));
create index if not exists companies_owner_idx on public.companies (owner_id, created_at desc);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ── Saved match runs ───────────────────────────────────────────────────────
-- Every match is kept so a buyer can revisit the reasoning behind a decision.
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

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.companies enable row level security;
alter table public.match_requests enable row level security;

drop policy if exists "companies_owner_all" on public.companies;
create policy "companies_owner_all" on public.companies
  for all using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "match_requests_owner_all" on public.match_requests;
create policy "match_requests_owner_all" on public.match_requests
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── Slug availability ──────────────────────────────────────────────────────
-- companies_owner_all filters SELECT as well as writes, so a signed-in user
-- cannot see anyone else's rows — a plain "is this slug taken" query would
-- always come back empty and answer "available" for every taken URL. This
-- runs as the definer to answer the one yes/no question without exposing rows.
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

-- ── Company logo storage ───────────────────────────────────────────────────
-- The size and type caps live on the bucket, not just in the upload form: the
-- storage API is callable directly by any signed-in user, so browser-side
-- validation alone would leave a public, unbounded file host on this domain.
-- SVG is deliberately excluded — a public bucket serves it back with any script
-- inside it intact. `do update` because on conflict-do-nothing would silently
-- skip retrofitting a bucket that already exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 4194304,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_logos_public_read" on storage.objects;
create policy "company_logos_public_read" on storage.objects
  for select using (bucket_id = 'company-logos');

-- Writes are confined to a folder named after the user's own id, so one user
-- can never overwrite another's logo: company-logos/<uid>/<file>
-- Policy names match supabase/setup.sql so running both leaves one set, not two.
drop policy if exists "company_logos_user_write" on storage.objects;
create policy "company_logos_user_write" on storage.objects
  for all using (
    bucket_id = 'company-logos' and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'company-logos' and (select auth.uid())::text = (storage.foldername(name))[1]
  );
