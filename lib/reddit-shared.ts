// Reddit types + normalizers shared by server code (lib/reddit.ts) and
// browser code (lib/reddit-browser.ts). Client-safe: no env vars, no secrets.

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

export interface RedditData {
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

export interface RedditListing {
  data: { after: string | null; children: { kind: string; data: RedditData }[] };
}

/** Strip "u/" / "/user/" prefixes and trailing slashes from user input. */
export function normalizeRedditUsername(raw: string): string {
  return raw.trim().replace(/^\/?u(ser)?\//i, "").replace(/\/+$/, "");
}

export function isValidRedditUsername(name: string): boolean {
  return /^[A-Za-z0-9_-]{3,20}$/.test(name);
}

function permalinkUrl(d: RedditData): string | null {
  if (d.permalink) return `https://www.reddit.com${d.permalink}`;
  return d.url ?? null;
}

export function normalizeSubmitted(d: RedditData): NormalizedItem {
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

export function normalizeComment(d: RedditData): NormalizedItem {
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
