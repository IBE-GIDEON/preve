create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('reddit', 'x', 'linkedin', 'bluesky', 'mastodon', 'rss', 'hackernews', 'devto', 'lemmy')),
  platform_user_id text,
  platform_username text,
  status text not null default 'connected' check (status in ('connected', 'disconnected', 'importing', 'error')),
  last_sync_at timestamptz,
  encrypted_token_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  platform text not null check (platform in ('reddit', 'x', 'linkedin', 'bluesky', 'mastodon', 'rss', 'hackernews', 'devto', 'lemmy')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  total_items integer not null default 0,
  imported_items integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.archive_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  platform text not null check (platform in ('reddit', 'x', 'linkedin', 'bluesky', 'mastodon', 'rss', 'hackernews', 'devto', 'lemmy')),
  platform_item_id text not null,
  kind text not null check (kind in ('post', 'comment', 'thread', 'article')),
  source_title text,
  body text not null,
  url text,
  topics text[] not null default '{}',
  summary text,
  engagement jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, platform_item_id)
);

create table if not exists public.archive_embeddings (
  archive_item_id uuid primary key references public.archive_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(384),
  model text not null default 'gte-small',
  created_at timestamptz not null default now()
);

create table if not exists public.saved_archive_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  archive_item_id uuid not null references public.archive_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, archive_item_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists connected_accounts_set_updated_at on public.connected_accounts;
create trigger connected_accounts_set_updated_at
  before update on public.connected_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists archive_items_set_updated_at on public.archive_items;
create trigger archive_items_set_updated_at
  before update on public.archive_items
  for each row execute function public.set_updated_at();

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

alter table public.profiles enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.import_jobs enable row level security;
alter table public.archive_items enable row level security;
alter table public.archive_embeddings enable row level security;
alter table public.saved_archive_items enable row level security;

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

drop policy if exists "connected_accounts_owner_all" on public.connected_accounts;
create policy "connected_accounts_owner_all" on public.connected_accounts
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "import_jobs_owner_all" on public.import_jobs;
create policy "import_jobs_owner_all" on public.import_jobs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "archive_items_owner_all" on public.archive_items;
create policy "archive_items_owner_all" on public.archive_items
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "archive_embeddings_owner_all" on public.archive_embeddings;
create policy "archive_embeddings_owner_all" on public.archive_embeddings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_archive_items_owner_all" on public.saved_archive_items;
create policy "saved_archive_items_owner_all" on public.saved_archive_items
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists archive_items_user_platform_idx on public.archive_items (user_id, platform);
create index if not exists archive_items_user_published_idx on public.archive_items (user_id, published_at desc);
create index if not exists archive_items_topics_idx on public.archive_items using gin (topics);
create index if not exists saved_archive_items_user_created_idx on public.saved_archive_items (user_id, created_at desc);
create index if not exists archive_embeddings_hnsw_idx
  on public.archive_embeddings using hnsw (embedding vector_cosine_ops);

-- Returns the caller's archive items ordered by cosine similarity to a query
-- embedding. security invoker => RLS on archive_items still applies.
create or replace function public.match_archive_items(query_embedding vector(384), match_count int default 30)
returns setof public.archive_items
language sql
stable
security invoker
set search_path = public
as $$
  select ai.*
  from public.archive_items ai
  join public.archive_embeddings ae on ae.archive_item_id = ai.id
  where ae.user_id = (select auth.uid())
  order by ae.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_archive_items(vector, int) to authenticated;

-- Durable per-user, per-feature AI rate limiting (see migrations/006_ai_usage.sql).
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'general',
  created_at timestamptz not null default now()
);

alter table public.ai_usage add column if not exists feature text not null default 'general';

create index if not exists ai_usage_user_feature_created_idx
  on public.ai_usage (user_id, feature, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_owner_all" on public.ai_usage;
create policy "ai_usage_owner_all" on public.ai_usage
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop function if exists public.record_ai_usage(int, int);
drop function if exists public.record_ai_usage(int, int, text);
create or replace function public.record_ai_usage(max_per_window int, feature_key text default 'general')
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  next_reset timestamptz := (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') + interval '1 day';
  reset_in int := greatest(1, ceil(extract(epoch from (next_reset - now()))))::int;
  used int;
begin
  if uid is null then
    return json_build_object('allowed', false, 'remaining', 0, 'limit', max_per_window, 'reset_in', reset_in);
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text || ':' || feature_key)::bigint);

  -- Drop rows from previous days so the count is just today's usage.
  delete from public.ai_usage
    where user_id = uid and feature = feature_key and created_at < day_start;

  select count(*) into used from public.ai_usage where user_id = uid and feature = feature_key;

  if used >= max_per_window then
    return json_build_object('allowed', false, 'remaining', 0, 'limit', max_per_window, 'reset_in', reset_in);
  end if;

  insert into public.ai_usage (user_id, feature) values (uid, feature_key);
  used := used + 1;
  return json_build_object('allowed', true, 'remaining', max_per_window - used, 'limit', max_per_window, 'reset_in', reset_in);
end;
$$;

grant execute on function public.record_ai_usage(int, text) to authenticated;

-- Full-text keyword search (see migrations/007_search.sql).
alter table public.archive_items
  add column if not exists fts tsvector
  generated always as (to_tsvector('english', coalesce(source_title, '') || ' ' || coalesce(body, ''))) stored;

create index if not exists archive_items_fts_idx on public.archive_items using gin (fts);

create or replace function public.search_archive_fts(
  q text,
  match_count int default 100,
  platform_filter text default null,
  kind_filter text default null,
  since timestamptz default null
)
returns setof public.archive_items
language sql
stable
security invoker
set search_path = public
as $$
  select ai.*
  from public.archive_items ai
  where ai.user_id = (select auth.uid())
    and ai.fts @@ websearch_to_tsquery('english', q)
    and (platform_filter is null or ai.platform = platform_filter)
    and (kind_filter is null or ai.kind = kind_filter)
    and (since is null or ai.published_at >= since)
  order by ts_rank(ai.fts, websearch_to_tsquery('english', q)) desc, ai.published_at desc nulls last
  limit match_count;
$$;

grant execute on function public.search_archive_fts(text, int, text, text, timestamptz) to authenticated;
