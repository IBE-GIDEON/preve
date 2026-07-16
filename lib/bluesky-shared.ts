// Bluesky import via the PUBLIC AT Protocol API — completely free and open:
// no API key, no OAuth app, no bot walls (verified reachable even from
// networks that wall Reddit). Client-safe: no env, no secrets; works from
// both the browser and the server.

import type { NormalizedItem } from "./reddit-shared";

const PUBLIC_API = "https://public.api.bsky.app/xrpc";

/** Accepts "@name", "name", "name.bsky.social", or a pasted profile URL. */
export function normalizeBlueskyHandle(raw: string): string {
  let handle = raw.trim().toLowerCase();
  handle = handle.replace(/^https?:\/\/(www\.)?bsky\.app\/profile\//, "").split(/[/?#]/)[0];
  handle = handle.replace(/^@/, "");
  if (handle && !handle.includes(".")) handle = `${handle}.bsky.social`;
  return handle;
}

export function isValidBlueskyHandle(handle: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(handle) && handle.length <= 253;
}

class FatalBlueskyError extends Error {}

export function isFatalBlueskyError(error: unknown): boolean {
  return error instanceof FatalBlueskyError;
}

interface FeedItem {
  post?: {
    uri?: string;
    author?: { handle?: string };
    record?: { text?: string; createdAt?: string; reply?: unknown };
    likeCount?: number;
    replyCount?: number;
    repostCount?: number;
  };
  reason?: unknown; // present on reposts — not the user's own words
}

interface FeedResponse {
  feed?: FeedItem[];
  cursor?: string;
}

function hashtagsFrom(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)) {
    tags.add(match[1].toLowerCase());
    if (tags.size >= 5) break;
  }
  return [...tags];
}

function normalizeFeedItem(item: FeedItem): NormalizedItem | null {
  const post = item.post;
  const uri = post?.uri ?? "";
  const text = post?.record?.text ?? "";
  if (!uri || !text.trim()) return null;

  const rkey = uri.split("/").pop() ?? "";
  const handle = post?.author?.handle ?? "";
  const createdAt = new Date(post?.record?.createdAt ?? NaN);

  return {
    platform_item_id: uri.slice(0, 200),
    kind: post?.record?.reply ? "comment" : "post",
    source_title: null,
    body: text,
    url: handle && rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : null,
    topics: hashtagsFrom(text),
    engagement: { likes: post?.likeCount ?? 0, comments: post?.replyCount ?? 0 },
    published_at: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
  };
}

/** Fetch a user's public posts + replies (paged, capped) and normalize. */
export async function fetchBlueskyPublicArchive(handle: string, maxPages = 10): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ actor: handle, limit: "100", filter: "posts_with_replies" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${PUBLIC_API}/app.bsky.feed.getAuthorFeed?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 400) throw new FatalBlueskyError("That Bluesky handle doesn't exist.");
    if (!res.ok) throw new Error(`Bluesky answered ${res.status}. Try again in a moment.`);

    const data = (await res.json()) as FeedResponse;
    for (const item of data.feed ?? []) {
      if (item.reason) continue; // repost of someone else — skip
      const normalized = normalizeFeedItem(item);
      if (normalized) items.push(normalized);
    }

    if (!data.cursor || (data.feed ?? []).length === 0) break;
    cursor = data.cursor;
  }

  return items;
}
