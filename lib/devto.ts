// Dev.to import via the free public Forem API — no key. One request per page
// returns article metadata (title, excerpt, tags, reactions).

import type { NormalizedItem } from "./reddit-shared";

const API = "https://dev.to/api/articles";

class FatalDevtoError extends Error {}
export function isFatalDevtoError(error: unknown): boolean {
  return error instanceof FatalDevtoError;
}

export function normalizeDevtoUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/dev\.to\//i, "")
    .replace(/\/+$/, "");
}

export function isValidDevtoUsername(name: string): boolean {
  return /^[A-Za-z0-9_]{1,40}$/.test(name);
}

interface DevtoArticle {
  id?: number;
  title?: string;
  description?: string;
  url?: string;
  published_at?: string;
  tag_list?: string[];
  positive_reactions_count?: number;
  comments_count?: number;
}

function normalizeArticle(a: DevtoArticle): NormalizedItem | null {
  if (!a.id) return null;
  const body = (a.description || a.title || "").trim();
  if (!body) return null;

  const created = new Date(a.published_at ?? NaN);

  return {
    platform_item_id: `devto_${a.id}`,
    kind: "post",
    source_title: a.title ?? null,
    body,
    url: a.url ?? null,
    topics: Array.isArray(a.tag_list) ? a.tag_list.slice(0, 5) : [],
    engagement: { likes: a.positive_reactions_count ?? 0, comments: a.comments_count ?? 0 },
    published_at: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
  };
}

/** Fetch a user's Dev.to articles (paged, capped) and normalize. */
export async function fetchDevtoArchive(rawUsername: string, maxPages = 5): Promise<NormalizedItem[]> {
  const username = normalizeDevtoUsername(rawUsername);
  if (!isValidDevtoUsername(username)) throw new FatalDevtoError("Enter a valid Dev.to username.");

  const items: NormalizedItem[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({ username, per_page: "100", page: String(page) });
    const res = await fetch(`${API}?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Dev.to fetch failed (${res.status}).`);
    const articles = (await res.json()) as DevtoArticle[];
    if (!Array.isArray(articles) || articles.length === 0) break;
    for (const article of articles) {
      const normalized = normalizeArticle(article);
      if (normalized) items.push(normalized);
    }
    if (articles.length < 100) break;
  }
  return items;
}
