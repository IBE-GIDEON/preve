-- M8: open platform values on archive_items + import_jobs (Bluesky and any
-- future platform). The base schema pinned platform to reddit/x/linkedin;
-- 004 already freed connected_accounts — this frees the remaining two.
-- Platform values are set server-side by the import routes, so app code
-- remains the source of truth. Idempotent.

do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where conrelid in ('public.archive_items'::regclass, 'public.import_jobs'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%platform%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;
