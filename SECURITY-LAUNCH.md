# Preve Launch Security Baseline

This app now has a real auth boundary, but launch quality depends on configuring the backing services correctly.

## Required Before Production

1. Create a Supabase project.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Add the site URL and `/auth/callback` to Supabase Auth redirect URLs.
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. Keep RLS enabled on all user-owned tables.
6. Enable email/password auth. Add Google provider credentials in Supabase only if Google sign in is required.
7. Store platform OAuth tokens in a secrets vault or encrypted token table, never in browser storage.
8. Use Supabase Auth MFA and SSO policies for enterprise customers.
9. Add server-side rate limits to auth callbacks, import triggers, and AI search endpoints.

## Current Boundary

- `/dashboard/*` and `/onboarding` require a valid Supabase session.
- The proxy refreshes auth cookies and validates the user with Supabase.
- The dashboard layout also validates the user server-side.
- Auth callbacks only redirect to safe same-origin app paths.
- New Supabase Auth users get a `profiles` row automatically through the database trigger.
- Manual pasted imports are written to `archive_items` with owner-scoped RLS.
- Saved posts are written to `saved_archive_items` with owner-scoped RLS.
- Browser local storage is limited to search preferences such as recent and saved searches.

## Not Yet Enterprise Complete

- No production OAuth apps for Reddit, X, or LinkedIn are configured.
- No background import worker is connected.
- No audit log UI exists yet.
- No org/team model exists yet.
- No billing or plan enforcement exists yet.
