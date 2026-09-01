-- M4: durable per-user, per-feature AI rate limiting. Replaces the in-memory
-- limiter (reset on every cold start, not shared across instances). Two buckets:
-- 'general' AI actions and 'suggest' (preve Posts idea generations), each with
-- its own daily cap. Safe to re-run.

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

-- Atomically records one action in the caller's `feature` bucket and reports
-- remaining quota. Advisory lock (keyed on user+feature) serializes concurrent
-- calls so the cap is strict. security invoker => RLS applies; user is auth.uid().
drop function if exists public.record_ai_usage(int, int);
create or replace function public.record_ai_usage(max_per_window int, window_seconds int, feature_key text default 'general')
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  used int;
  reset_at timestamptz;
begin
  if uid is null then
    return json_build_object('allowed', false, 'remaining', 0, 'limit', max_per_window, 'reset_in', window_seconds);
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text || ':' || feature_key)::bigint);

  delete from public.ai_usage
    where user_id = uid and feature = feature_key
      and created_at < now() - make_interval(secs => window_seconds);

  select count(*) into used from public.ai_usage where user_id = uid and feature = feature_key;

  if used >= max_per_window then
    select min(created_at) + make_interval(secs => window_seconds) into reset_at
      from public.ai_usage where user_id = uid and feature = feature_key;
    return json_build_object(
      'allowed', false, 'remaining', 0, 'limit', max_per_window,
      'reset_in', greatest(1, ceil(extract(epoch from (reset_at - now()))))::int);
  end if;

  insert into public.ai_usage (user_id, feature) values (uid, feature_key);
  used := used + 1;

  select min(created_at) + make_interval(secs => window_seconds) into reset_at
    from public.ai_usage where user_id = uid and feature = feature_key;
  return json_build_object(
    'allowed', true, 'remaining', max_per_window - used, 'limit', max_per_window,
    'reset_in', greatest(1, ceil(extract(epoch from (reset_at - now()))))::int);
end;
$$;

grant execute on function public.record_ai_usage(int, int, text) to authenticated;
