-- M5: proper full-text keyword search. A stored tsvector over title+body with a
-- GIN index gives relevance ranking, stemming (search "running" finds "run"),
-- and web-style query syntax (phrases in quotes, OR, -exclude). Safe to re-run.

alter table public.archive_items
  add column if not exists fts tsvector
  generated always as (to_tsvector('english', coalesce(source_title, '') || ' ' || coalesce(body, ''))) stored;

create index if not exists archive_items_fts_idx on public.archive_items using gin (fts);

-- Ranked full-text search over the caller's own items, with optional platform /
-- kind / recency filters. security invoker => RLS on archive_items still applies.
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
