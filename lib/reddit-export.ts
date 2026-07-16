// Parser for Reddit's official data export (reddit.com/settings/data-request).
// The export ZIP contains posts.csv and comments.csv — users unzip and upload
// them. This path needs no API access at all, so no bot wall can break it.
// Client-safe: pure functions, no env, no secrets.

import type { NormalizedItem } from "./reddit-shared";

/** Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

/** Export dates look like "2023-01-05 12:34:56 UTC" (sometimes plain ISO). */
function parseExportDate(raw: string): string {
  const cleaned = (raw ?? "").trim().replace(" UTC", "");
  const candidate = cleaned.includes("T") ? cleaned : `${cleaned.replace(" ", "T")}Z`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/**
 * Parse one CSV from a Reddit data export into normalized archive items.
 * Detects posts.csv vs comments.csv by the header row (posts have "title").
 * Returns [] for CSVs that aren't post/comment tables (the export has many).
 */
export function parseRedditExportCsv(text: string): NormalizedItem[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const iId = col("id");
  const iBody = col("body");
  if (iId === -1 || iBody === -1) return []; // not a posts/comments table

  const iTitle = col("title");
  const iPermalink = col("permalink");
  const iDate = col("date");
  const iSubreddit = col("subreddit");
  const iUrl = col("url");
  const isPost = iTitle !== -1;

  const items: NormalizedItem[] = [];
  for (const row of rows.slice(1)) {
    const id = (row[iId] ?? "").trim();
    if (!/^[a-z0-9]{1,20}$/i.test(id)) continue;

    const body = (row[iBody] ?? "").trim();
    const title = isPost ? (row[iTitle] ?? "").trim() : "";
    const link = iUrl !== -1 ? (row[iUrl] ?? "").trim() : "";
    const permalink = iPermalink !== -1 ? (row[iPermalink] ?? "").trim() : "";
    const subreddit = iSubreddit !== -1 ? (row[iSubreddit] ?? "").trim() : "";

    const content = body || title || link;
    if (!content) continue;

    items.push({
      platform_item_id: `${isPost ? "t3" : "t1"}_${id}`,
      kind: isPost ? "post" : "comment",
      source_title: isPost && title ? title : null,
      body: content,
      url: permalink
        ? permalink.startsWith("http")
          ? permalink
          : `https://www.reddit.com${permalink}`
        : null,
      topics: subreddit ? [subreddit] : [],
      // The export doesn't include scores — engagement starts at zero and a
      // later API sync can enrich it.
      engagement: { likes: 0, comments: 0 },
      published_at: parseExportDate(iDate !== -1 ? row[iDate] ?? "" : ""),
    });
  }
  return items;
}
