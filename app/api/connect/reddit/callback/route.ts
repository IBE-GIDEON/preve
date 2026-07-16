import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { sealToken } from "../../../../../lib/crypto/tokens";
import { exchangeRedditCode, getRedditIdentity, hasRedditEnv } from "../../../../../lib/reddit";
import { createClient } from "../../../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const back = (query: string) => NextResponse.redirect(new URL(`/dashboard/accounts?${query}`, origin));

  if (params.get("error")) return back("error=reddit_denied");

  const code = params.get("code");
  const state = params.get("state");

  const jar = await cookies();
  const savedState = jar.get("reddit_oauth_state")?.value;
  jar.delete("reddit_oauth_state");

  if (!code || !state || !savedState || state !== savedState) return back("error=reddit_state");
  if (!hasRedditEnv()) return back("error=reddit_not_configured");

  try {
    const redirectUri = `${origin}/api/connect/reddit/callback`;
    const tokens = await exchangeRedditCode(code, redirectUri);
    const identity = await getRedditIdentity(tokens.access_token);

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.redirect(new URL("/auth?next=/dashboard/accounts", origin));
    }

    // Tokens live in `metadata` (server-only column — the accounts client never
    // selects it, so they never reach the browser). Sealed at rest when
    // TOKEN_ENCRYPTION_KEY is configured.
    const refreshToken = tokens.refresh_token ? await sealToken(tokens.refresh_token) : null;
    const { error } = await supabase.from("connected_accounts").upsert(
      {
        user_id: userData.user.id,
        platform: "reddit",
        platform_username: identity.username,
        status: "connected",
        last_sync_at: new Date().toISOString(),
        metadata: { refresh_token: refreshToken, scope: tokens.scope },
      },
      { onConflict: "user_id,platform" },
    );
    if (error) return back("error=reddit_save");

    // autoimport=1 → the accounts page kicks off the first import by itself.
    return back("connected=reddit&autoimport=1");
  } catch {
    return back("error=reddit_failed");
  }
}
