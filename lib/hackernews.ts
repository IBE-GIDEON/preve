// Hacker News import via the free Algolia HN Search API — no key, bulk paged
// (no per-item N+1). Returns a user's stories, Ask/Show posts, and comments.

import { htmlToText } from "./mastodon-shared";
import type { NormalizedItem } from "./reddit-shared";

const API = "https://hn.algolia.com/api/v1/search_by_date";

class FatalHnError extends Error {}
export function isFatalHnError(error: unknown): boolean {
  return error instanceof FatalHnError;
}

export function normalizeHnUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").replace(/^https?:\/\/news\.ycombinator\.com\/user\?id=/i, "");
}

export function isValidHnUsername(name: string): boolean {
  return /^[A-Za-z0-9_-]{2,20}$/.test(name);
}

interface HnHit {
  objectID?: string;
  title?: string | null;
  url?: string | null;
  story_text?: string | null;
  comment_text?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at?: string;
  _tags?: string[];
}

function normalizeHit(hit: HnHit): NormalizedItem | null {
  const id = hit.objectID;
  if (!id) return null;

  const isComment = (hit._tags ?? []).includes("comment");
  const raw = hit.comment_text || hit.story_text || hit.title || "";
  const body = htmlToText(raw);
  if (!body) return null;

  const created = new Date(hit.created_at ?? NaN);

  return {
    platform_item_id: `hn_${id}`,
    kind: isComment ? "comment" : "post",
    source_title: !isComment && hit.title ? hit.title : null,
    body,
    url: `https://news.ycombinator.com/item?id=${id}`,
    topics: [],
    engagement: { likes: hit.points ?? 0, comments: hit.num_comments ?? 0 },
    published_at: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
  };
}

/** Fetch a user's HN stories + comments (paged, capped) and normalize. */
export async function fetchHackerNewsArchive(rawUsername: string, maxPages = 5): Promise<NormalizedItem[]> {
  const username = normalizeHnUsername(rawUsername);
  if (!isValidHnUsername(username)) throw new FatalHnError("Enter a valid Hacker News username.");

  const items: NormalizedItem[] = [];
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      tags: `author_${username}`,
      hitsPerPage: "100",
      page: String(page),
    });
    const res = await fetch(`${API}?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Hacker News fetch failed (${res.status}).`);
    const data = (await res.json()) as { hits?: HnHit[]; nbPages?: number };
    const hits = data.hits ?? [];
    for (const hit of hits) {
      const normalized = normalizeHit(hit);
      if (normalized) items.push(normalized);
    }
    if (hits.length === 0 || (data.nbPages !== undefined && page + 1 >= data.nbPages)) break;
  }
  return items;
}
