# Preve Tonight Setup

Use this checklist to run the app with real accounts and private archive storage.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - If your Supabase project only shows an anon/public browser key, put it in `NEXT_PUBLIC_SUPABASE_ANON_KEY` or paste it into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. In Supabase Auth, enable email/password. Keep email confirmation on for production.
6. To use Google sign in, create a Google OAuth client and paste the Google client ID/client secret into Supabase Auth Providers > Google. These Google secrets do not go in this app's `.env.local`.
7. Add these redirect URLs in Supabase Auth:
   - `http://localhost:3000/auth/callback`
   - Your production URL plus `/auth/callback`
8. Set the Supabase Auth Site URL to your production URL.
9. Run `npm install` if dependencies are missing.
10. Run `npm run build` before deploy.

Tonight-ready flow:

- Sign up or sign in with Supabase Auth.
- Open `/dashboard/imports`.
- Paste posts, comments, threads, or articles separated by blank lines.
- Search the imported archive from `/dashboard`.
- Save posts and revisit them from `/dashboard/saved`.

Local preview:

- In development, dashboard auth is bypassed when Supabase env vars are missing so you can inspect pages locally.
- To force local preview even after adding Supabase env vars, set `PREVE_DEV_BYPASS_AUTH=true`.
- This bypass is disabled when `NODE_ENV=production`.
- Do not set `PREVE_DEV_BYPASS_AUTH` in production.

Still future work for enterprise:

- OAuth import workers for Reddit, X, and LinkedIn.
- Organization/team accounts.
- Audit logs.
- Billing and rate limits.
- Embeddings-backed semantic search.
