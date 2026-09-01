// Parser for X/Twitter's official data archive (Settings -> Download an archive
// of your data). The ZIP contains data/tweets.js — every tweet as a JSON array
// wrapped in a `window.YTD.tweets.part0 = [...]` assignment. X's live API is
// paid-only, so this upload is the keyless path, exactly like Reddit/LinkedIn.
// Client-safe: pure functions, no env, no secrets.

import type { NormalizedItem } from "./reddit-shared";

interface TweetEntities {
  urls?: Array<{ url?: string; expanded_url?: string }>;
}

interface RawTweet {
  id_str?: string;
  id?: string;
  full_text?: string;
  text?: string;
  created_at?: string;
  favorite_count?: string | number;
  in_reply_to_status_id_str?: string;
  retweeted_status?: unknown;
  entities?: TweetEntities;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Replace t.co short links with the real URLs the archive stores in entities. */
function expandUrls(text: string, entities?: TweetEntities): string {
  let out = text;
  for (const u of entities?.urls ?? []) {
    if (u.url && u.expanded_url) out = out.split(u.url).join(u.expanded_url);
  }
  return out;
}

/** Twitter archive dates look like "Wed Oct 10 20:19:24 +0000 2018". */
function parseTweetDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Parse an X archive tweets.js file (raw text) into normalized archive items.
 * Skips retweets (other people's words). Replies become comments, standalone
 * tweets become posts.
 */
export function parseTwitterExportJs(text: string): NormalizedItem[] {
  // The file is `window.YTD.tweets.part0 = [ ... ]`; slice from the array start.
  const start = text.indexOf("[");
  if (start === -1) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(text.slice(start));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const items: NormalizedItem[] = [];
  for (const entry of arr) {
    const t: RawTweet =
      entry && typeof entry === "object" && "tweet" in entry
        ? ((entry as { tweet: RawTweet }).tweet ?? {})
        : (entry as RawTweet);
    if (!t || typeof t !== "object") continue;

    const id = (t.id_str ?? t.id ?? "").toString().trim();
    if (!/^\d{1,25}$/.test(id)) continue;

    const rawBody = (t.full_text ?? t.text ?? "").toString();
    if (!rawBody || rawBody.startsWith("RT @") || t.retweeted_status) continue; // skip retweets

    const body = decodeEntities(expandUrls(rawBody, t.entities)).trim();
    if (!body) continue;

    const isReply = Boolean(t.in_reply_to_status_id_str);
    items.push({
      platform_item_id: `tw_${id}`.slice(0, 40),
      kind: isReply ? "comment" : "post",
      source_title: isReply ? "Reply" : "Tweet",
      body: body.slice(0, 40000),
      url: `https://x.com/i/web/status/${id}`,
      topics: [],
      engagement: { likes: Number(t.favorite_count) || 0, comments: 0 },
      published_at: parseTweetDate(t.created_at ?? ""),
    });
  }
  return items;
}

/** File names inside the X archive ZIP that hold tweets. */
export function isTwitterExportFile(baseName: string): boolean {
  const n = baseName.toLowerCase();
  return n === "tweets.js" || n === "tweet.js" || /^tweets?-part\d+\.js$/.test(n);
}
