import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getRedditAuthorizeUrl, hasRedditEnv } from "../../../../lib/reddit";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!hasRedditEnv()) {
    return NextResponse.redirect(new URL("/dashboard/accounts?error=reddit_not_configured", origin));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${origin}/api/connect/reddit/callback`;

  const jar = await cookies();
  jar.set("reddit_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(getRedditAuthorizeUrl(redirectUri, state));
}
