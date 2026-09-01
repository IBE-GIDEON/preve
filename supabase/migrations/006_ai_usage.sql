-- M4: durable per-user AI rate limiting. Replaces the in-memory limiter, which
-- reset on every serverless cold start and wasn't shared across instances (so
-- the on-screen "N left" wasn't actually enforced).

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_owner_all" on public.ai_usage;
create policy "ai_usage_owner_all" on public.ai_usage
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Atomically records one AI action for the caller and reports remaining quota.
-- pg_advisory_xact_lock serializes concurrent calls per user so the cap is
-- strict. security invoker => RLS applies; user_id is always auth.uid().
create or replace function public.record_ai_usage(max_per_window int, window_seconds int)
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

  perform pg_advisory_xact_lock(hashtext(uid::text)::bigint);

  delete from public.ai_usage
    where user_id = uid and created_at < now() - make_interval(secs => window_seconds);

  select count(*) into used from public.ai_usage where user_id = uid;

  if used >= max_per_window then
    select min(created_at) + make_interval(secs => window_seconds) into reset_at
      from public.ai_usage where user_id = uid;
    return json_build_object(
      'allowed', false, 'remaining', 0, 'limit', max_per_window,
      'reset_in', greatest(1, ceil(extract(epoch from (reset_at - now()))))::int);
  end if;

  insert into public.ai_usage (user_id) values (uid);
  used := used + 1;

  select min(created_at) + make_interval(secs => window_seconds) into reset_at
    from public.ai_usage where user_id = uid;
  return json_build_object(
    'allowed', true, 'remaining', max_per_window - used, 'limit', max_per_window,
    'reset_in', greatest(1, ceil(extract(epoch from (reset_at - now()))))::int);
end;
$$;

grant execute on function public.record_ai_usage(int, int) to authenticated;
