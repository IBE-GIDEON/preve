// Lemmy import via the public v3 API — open and federated, no keys. A user's
// posts + comments are readable from their instance without auth.

import type { NormalizedItem } from "./reddit-shared";

const USER_AGENT = "web:preve:1.0 (personal content archive)";

class FatalLemmyError extends Error {}
export function isFatalLemmyError(error: unknown): boolean {
  return error instanceof FatalLemmyError;
}

/** Accepts "@user@instance", "user@instance", or a profile URL (…/u/user). */
export function parseLemmyHandle(raw: string): { instance: string; username: string } | null {
  const s = raw.trim();

  const url = s.match(/^https?:\/\/([^/]+)\/u\/([A-Za-z0-9_]+)/i);
  if (url) return { instance: url[1].toLowerCase(), username: url[2] };

  const at = s.replace(/^@/, "");
  const parts = at.split("@");
  if (parts.length === 2 && /^[A-Za-z0-9_]+$/.test(parts[0]) && parts[1].includes(".")) {
    return { instance: parts[1].toLowerCase(), username: parts[0] };
  }
  return null;
}

export function isValidLemmyHandle(raw: string): boolean {
  return parseLemmyHandle(raw) !== null;
}

interface LemmyPostView {
  post?: { id?: number; name?: string; body?: string | null; url?: string | null; published?: string; ap_id?: string };
  counts?: { score?: number; comments?: number };
}

interface LemmyCommentView {
  comment?: { id?: number; content?: string; published?: string; ap_id?: string };
  counts?: { score?: number };
}

function isoOrNow(raw?: string): string {
  const d = new Date(raw ?? NaN);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalizePost(pv: LemmyPostView, instance: string): NormalizedItem | null {
  const p = pv.post;
  if (!p?.id) return null;
  const body = (p.body || p.name || "").trim();
  if (!body) return null;
  return {
    platform_item_id: `lemmy_${p.ap_id || `${instance}_p${p.id}`}`.slice(0, 200),
    kind: "post",
    source_title: p.name ?? null,
    body,
    url: p.ap_id || `https://${instance}/post/${p.id}`,
    topics: [],
    engagement: { likes: pv.counts?.score ?? 0, comments: pv.counts?.comments ?? 0 },
    published_at: isoOrNow(p.published),
  };
}

function normalizeComment(cv: LemmyCommentView, instance: string): NormalizedItem | null {
  const c = cv.comment;
  if (!c?.id) return null;
  const body = (c.content || "").trim();
  if (!body) return null;
  return {
    platform_item_id: `lemmy_${c.ap_id || `${instance}_c${c.id}`}`.slice(0, 200),
    kind: "comment",
    source_title: null,
    body,
    url: c.ap_id || `https://${instance}/comment/${c.id}`,
    topics: [],
    engagement: { likes: cv.counts?.score ?? 0, comments: 0 },
    published_at: isoOrNow(c.published),
  };
}

/** Fetch a user's Lemmy posts + comments (paged, capped) and normalize. */
export async function fetchLemmyArchive(rawHandle: string, maxPages = 5): Promise<NormalizedItem[]> {
  const parsed = parseLemmyHandle(rawHandle);
  if (!parsed) throw new FatalLemmyError("Enter a valid Lemmy handle like @you@lemmy.world.");
  const { instance, username } = parsed;

  const items: NormalizedItem[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = new URLSearchParams({ username, sort: "New", limit: "50", page: String(page) });
    const res = await fetch(`https://${instance}/api/v3/user?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (res.status === 404 || res.status === 400) {
      throw new FatalLemmyError("That Lemmy account doesn't exist on that instance.");
    }
    if (!res.ok) throw new Error(`Lemmy fetch failed (${res.status}).`);

    const data = (await res.json()) as { posts?: LemmyPostView[]; comments?: LemmyCommentView[] };
    const posts = data.posts ?? [];
    const comments = data.comments ?? [];
    for (const pv of posts) {
      const n = normalizePost(pv, instance);
      if (n) items.push(n);
    }
    for (const cv of comments) {
      const n = normalizeComment(cv, instance);
      if (n) items.push(n);
    }
    if (posts.length === 0 && comments.length === 0) break;
  }
  return items;
}
