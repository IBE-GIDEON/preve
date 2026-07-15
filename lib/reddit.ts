// Reddit OAuth + API helpers. Server-only (uses client secret) — never import
// into client components.

const AUTH_BASE = "https://www.reddit.com/api/v1";
const API_BASE = "https://oauth.reddit.com";
const USER_AGENT = "web:preve:1.0.0 (personal content archive)";

export const REDDIT_SCOPE = "identity history read";

export function hasRedditEnv() {
  return Boolean(process.env.REDDIT_CLIENT_ID?.trim() && process.env.REDDIT_CLIENT_SECRET?.trim());
}

function clientId() {
  return process.env.REDDIT_CLIENT_ID!.trim();
}

function basicAuthHeader() {
  const secret = process.env.REDDIT_CLIENT_SECRET!.trim();
  return `Basic ${Buffer.from(`${clientId()}:${secret}`).toString("base64")}`;
}

export function getRedditAuthorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    state,
    redirect_uri: redirectUri,
    duration: "permanent",
    scope: REDDIT_SCOPE,
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

export interface RedditTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeRedditCode(code: string, redirectUri: string): Promise<RedditTokens> {
  const res = await fetch(`${AUTH_BASE}/access_token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Reddit token exchange failed (${res.status})`);
  return (await res.json()) as RedditTokens;
}

/** Exchange a stored refresh token for a fresh access token (used at import time). */
export async function refreshRedditToken(refreshToken: string): Promise<RedditTokens> {
  const res = await fetch(`${AUTH_BASE}/access_token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Reddit token refresh failed (${res.status})`);
  return (await res.json()) as RedditTokens;
}

export async function getRedditIdentity(accessToken: string): Promise<{ username: string }> {
  const res = await fetch(`${API_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Could not fetch Reddit identity (${res.status})`);
  const data = (await res.json()) as { name: string };
  return { username: data.name };
}

export { API_BASE as REDDIT_API_BASE, USER_AGENT as REDDIT_USER_AGENT };
