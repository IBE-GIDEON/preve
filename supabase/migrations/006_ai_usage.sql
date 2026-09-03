-- M4: durable per-user, per-feature AI rate limiting. Two buckets ('general'
-- and 'suggest'), each with its own CALENDAR-DAY cap that resets at midnight
-- UTC — a new day gives a fresh quota no matter when it was last used, NOT a
-- rolling 24h window. Safe to re-run.

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'general',
  created_at timestamptz not null default now()
);

-- In case an earlier version of this table already exists without `feature`.
alter table public.ai_usage add column if not exists feature text not null default 'general';

create index if not exists ai_usage_user_feature_created_idx
  on public.ai_usage (user_id, feature, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_owner_all" on public.ai_usage;
create policy "ai_usage_owner_all" on public.ai_usage
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Records one action in the caller's `feature` bucket for TODAY (midnight UTC to
-- midnight UTC) and reports remaining quota + seconds until the next reset.
-- Advisory lock (per user+feature) keeps the count strict. security invoker =>
-- RLS applies; user is always auth.uid(). Older signatures dropped first so the
-- 2-arg version is unambiguous.
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
