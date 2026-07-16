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

// ── Import: fetch + normalize a user's posts and comments ───────────────────

export interface NormalizedItem {
  platform_item_id: string;
  kind: "post" | "comment";
  source_title: string | null;
  body: string;
  url: string | null;
  topics: string[];
  engagement: { likes: number; comments: number };
  published_at: string;
}

interface RedditData {
  id?: string;
  name?: string;
  title?: string;
  selftext?: string;
  body?: string;
  permalink?: string;
  url?: string;
  subreddit?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  link_title?: string;
}

async function fetchListing(accessToken: string, path: string, after?: string) {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("limit", "100");
  url.searchParams.set("raw_json", "1");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Reddit fetch failed (${res.status})`);
  return (await res.json()) as { data: { after: string | null; children: { kind: string; data: RedditData }[] } };
}

function permalinkUrl(d: RedditData): string | null {
  if (d.permalink) return `https://www.reddit.com${d.permalink}`;
  return d.url ?? null;
}

function normalizeSubmitted(d: RedditData): NormalizedItem {
  return {
    platform_item_id: d.name ?? `t3_${d.id}`,
    kind: "post",
    source_title: d.title ?? null,
    body: (d.selftext && d.selftext.trim()) || d.title || "",
    url: permalinkUrl(d),
    topics: d.subreddit ? [d.subreddit] : [],
    engagement: { likes: d.score ?? 0, comments: d.num_comments ?? 0 },
    published_at: new Date((d.created_utc ?? 0) * 1000).toISOString(),
  };
}

function normalizeComment(d: RedditData): NormalizedItem {
  return {
    platform_item_id: d.name ?? `t1_${d.id}`,
    kind: "comment",
    source_title: d.link_title ?? null,
    body: d.body ?? "",
    url: permalinkUrl(d),
    topics: d.subreddit ? [d.subreddit] : [],
    engagement: { likes: d.score ?? 0, comments: 0 },
    published_at: new Date((d.created_utc ?? 0) * 1000).toISOString(),
  };
}

/** Fetch a user's submitted posts + comments (paged, capped) and normalize. */
export async function fetchRedditArchive(
  accessToken: string,
  username: string,
  maxPagesPerType = 3,
): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];

  for (const type of ["submitted", "comments"] as const) {
    let after: string | undefined;
    for (let page = 0; page < maxPagesPerType; page++) {
      const listing = await fetchListing(accessToken, `/user/${username}/${type}`, after);
      for (const child of listing.data.children) {
        items.push(type === "submitted" ? normalizeSubmitted(child.data) : normalizeComment(child.data));
      }
      if (!listing.data.after) break;
      after = listing.data.after;
    }
  }

  return items;
}

// ── Keyless import: Reddit's public JSON endpoints ──────────────────────────
// A user's posts/comments are public JSON — no OAuth app, no API key. The
// same listing shape as the OAuth API, so the normalizers above are reused.
// Some hosts bot-wall certain IPs, so each is tried until one returns JSON.

const PUBLIC_HOSTS = ["https://www.reddit.com", "https://old.reddit.com", "https://api.reddit.com"];

/** Strip "u/" / "/user/" prefixes and trailing slashes from user input. */
export function normalizeRedditUsername(raw: string): string {
  return raw.trim().replace(/^\/?u(ser)?\//i, "").replace(/\/+$/, "");
}

export function isValidRedditUsername(name: string): boolean {
  return /^[A-Za-z0-9_-]{3,20}$/.test(name);
}

async function fetchPublicListing(username: string, type: "submitted" | "comments", after?: string) {
  const params = new URLSearchParams({ limit: "100", raw_json: "1" });
  if (after) params.set("after", after);

  for (const host of PUBLIC_HOSTS) {
    // api.reddit.com serves JSON natively; the others need the .json suffix.
    const path =
      host === "https://api.reddit.com" ? `/user/${username}/${type}` : `/user/${username}/${type}.json`;
    try {
      const res = await fetch(`${host}${path}?${params.toString()}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 404) throw new Error("That Reddit username doesn't exist.");
      if (!res.ok) continue; // walled or rate limited on this host — try the next
      if (!(res.headers.get("content-type") ?? "").includes("json")) continue; // bot wall serving HTML
      return (await res.json()) as {
        data: { after: string | null; children: { kind: string; data: RedditData }[] };
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("doesn't exist")) throw error;
      // network error on this host — fall through to the next
    }
  }
  throw new Error("Reddit is blocking anonymous access right now. Try again in a few minutes.");
}

/** Fetch a user's PUBLIC posts + comments without any credentials. */
export async function fetchRedditPublicArchive(username: string, maxPagesPerType = 3): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];

  for (const type of ["submitted", "comments"] as const) {
    let after: string | undefined;
    for (let page = 0; page < maxPagesPerType; page++) {
      const listing = await fetchPublicListing(username, type, after);
      for (const child of listing.data.children) {
        items.push(type === "submitted" ? normalizeSubmitted(child.data) : normalizeComment(child.data));
      }
      if (!listing.data.after) break;
      after = listing.data.after;
    }
  }

  return items;
}
