# Preve Launch Security Baseline

This app now has a real auth boundary, but launch quality depends on configuring the backing services correctly.

## Required Before Production

1. Create a Supabase project.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Add the site URL and `/auth/callback` to Supabase Auth redirect URLs.
4. Run `supabase/setup.sql` in the Supabase SQL editor.
5. Keep RLS enabled on all user-owned tables.
6. Enable email/password auth. Add Google provider credentials in Supabase only if Google sign in is required.
7. Use Supabase Auth MFA and SSO policies for enterprise customers.
8. Add server-side rate limits to auth callbacks and the AI matching endpoint.

## Current Boundary

- `/dashboard/*` and `/onboarding` require a valid Supabase session.
- The proxy refreshes auth cookies and validates the user with Supabase.
- The dashboard layout also validates the user server-side.
- Auth callbacks only redirect to safe same-origin app paths.
- New Supabase Auth users get a `profiles` row automatically through the database trigger.
- Company pages are written to `companies` with owner-scoped RLS.
- Match runs are written to `match_requests` with owner-scoped RLS.

## Not Yet Enterprise Complete

- Provider results come from the model, not a verified provider directory.
- No audit log UI exists yet.
- No org/team model exists yet.
- No billing or plan enforcement exists yet.
