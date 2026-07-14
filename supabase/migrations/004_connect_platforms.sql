-- Phase 3.1: allow connecting any social platform (not just reddit/x/linkedin).
-- Drops the platform CHECK constraint on connected_accounts so the app can
-- offer the full set of platforms. Idempotent.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.connected_accounts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%platform%'
  loop
    execute format('alter table public.connected_accounts drop constraint %I', c.conname);
  end loop;
end $$;
