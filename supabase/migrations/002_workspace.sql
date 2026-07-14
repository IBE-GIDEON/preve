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
