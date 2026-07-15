-- M3: semantic search with Supabase's built-in gte-small (384-dim) embeddings.
-- Recreates archive_embeddings at 384 dims (it was sized for 1536) and adds a
-- similarity RPC. The table is empty pre-launch, so recreating is safe.

drop table if exists public.archive_embeddings cascade;

create table public.archive_embeddings (
  archive_item_id uuid primary key references public.archive_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(384),
  model text not null default 'gte-small',
  created_at timestamptz not null default now()
);

alter table public.archive_embeddings enable row level security;

drop policy if exists "archive_embeddings_owner_all" on public.archive_embeddings;
create policy "archive_embeddings_owner_all" on public.archive_embeddings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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
