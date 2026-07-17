// Mastodon import via the PUBLIC REST API — free and open, no keys, no OAuth
// app. A user's public posts are readable from their instance without auth.
// Server-side (uses global fetch); no secrets, so it stays a shared module.

import type { NormalizedItem } from "./reddit-shared";

const USER_AGENT = "web:preve:1.0 (personal content archive)";

class FatalMastodonError extends Error {}

export function isFatalMastodonError(error: unknown): boolean {
  return error instanceof FatalMastodonError;
}

/** Accepts "@user@instance", "user@instance", or a profile URL. */
export function parseMastodonHandle(raw: string): { instance: string; username: string } | null {
  const s = raw.trim();

  // Profile URL: https://instance/@user  or  https://instance/users/user
  const url = s.match(/^https?:\/\/([^/]+)\/(?:@|users\/)([A-Za-z0-9_.]+)/i);
  if (url) return { instance: url[1].toLowerCase(), username: url[2] };

  // @user@instance.social  or  user@instance.social
  const at = s.replace(/^@/, "");
  const parts = at.split("@");
  if (parts.length === 2 && /^[A-Za-z0-9_.]+$/.test(parts[0]) && parts[1].includes(".")) {
    return { instance: parts[1].toLowerCase(), username: parts[0] };
  }
  return null;
}

export function isValidMastodonHandle(raw: string): boolean {
  return parseMastodonHandle(raw) !== null;
}

/** Mastodon status content is HTML — turn it into clean plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return "";
      }
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface MastodonStatus {
  id?: string;
  uri?: string;
  url?: string;
  content?: string;
  spoiler_text?: string;
  created_at?: string;
  favourites_count?: number;
  reblogs_count?: number;
  replies_count?: number;
  in_reply_to_id?: string | null;
  reblog?: unknown;
  tags?: { name?: string }[];
  media_attachments?: { description?: string | null }[];
}

function normalizeStatus(s: MastodonStatus): NormalizedItem | null {
  const id = s.uri || s.id;
  if (!id) return null;

  const text = htmlToText(s.content ?? "");
  const alts = (s.media_attachments ?? [])
    .map((m) => (m.description ?? "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((a) => `[image: ${a}]`);
  const parts = [s.spoiler_text?.trim(), text, ...alts].filter(Boolean);
  const body = parts.join("\n");
  if (!body) return null;

  const created = new Date(s.created_at ?? NaN);

  return {
    platform_item_id: id.slice(0, 200),
    kind: s.in_reply_to_id ? "comment" : "post",
    source_title: null,
    body,
    url: s.url || s.uri || null,
    topics: (s.tags ?? [])
      .map((t) => (t.name ?? "").toLowerCase())
      .filter(Boolean)
      .slice(0, 5),
    engagement: { likes: s.favourites_count ?? 0, comments: s.replies_count ?? 0 },
    published_at: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
  };
}

async function lookupAccountId(instance: string, username: string): Promise<string> {
  const res = await fetch(
    `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
  );
  if (res.status === 404) throw new FatalMastodonError("That Mastodon account doesn't exist.");
  if (res.status === 401 || res.status === 403) {
    throw new FatalMastodonError("That instance requires login to read posts. Try a public instance handle.");
  }
  if (!res.ok) throw new Error(`Mastodon lookup failed (${res.status}).`);
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new FatalMastodonError("Couldn't find that Mastodon account.");
  return data.id;
}

/** Fetch a user's PUBLIC posts + replies (paged, capped) and normalize. */
export async function fetchMastodonPublicArchive(rawHandle: string, maxPages = 10): Promise<NormalizedItem[]> {
  const parsed = parseMastodonHandle(rawHandle);
  if (!parsed) throw new FatalMastodonError("Enter a valid Mastodon handle like @you@mastodon.social.");
  const { instance, username } = parsed;

  const accountId = await lookupAccountId(instance, username);
  const items: NormalizedItem[] = [];
  let maxId: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ limit: "40", exclude_reblogs: "true" });
    if (maxId) params.set("max_id", maxId);

    const res = await fetch(`https://${instance}/api/v1/accounts/${accountId}/statuses?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`Mastodon fetch failed (${res.status}).`);
    const statuses = (await res.json()) as MastodonStatus[];
    if (!Array.isArray(statuses) || statuses.length === 0) break;

    for (const status of statuses) {
      if (status.reblog) continue; // a boost of someone else's post — not the user's words
      const normalized = normalizeStatus(status);
      if (normalized) items.push(normalized);
    }

    maxId = statuses[statuses.length - 1]?.id;
    if (!maxId || statuses.length < 40) break;
  }

  return items;
}
