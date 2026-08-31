// Parser for LinkedIn's official data export (Settings → Get a copy of your
// data). We import the two files that contain YOUR OWN words:
//   • Shares.csv   → your posts (ShareCommentary = the text you wrote)
//   • Comments.csv → the comments you left (Message = the text you wrote)
//
// We deliberately do NOT import Reactions.csv ("posts you liked"): the export
// stores only a link + reaction type with no text, and those are other people's
// posts — not your content to resurface. Client-safe: pure functions, no env.

import { parseCsv } from "./reddit-export";
import type { NormalizedItem } from "./reddit-shared";

/** LinkedIn export dates: "2023-05-01 12:34:56" (UTC) or plain ISO. */
function parseLinkedInDate(raw: string): string {
  const cleaned = (raw ?? "").trim().replace(" UTC", "");
  if (!cleaned) return new Date().toISOString();
  const candidate = cleaned.includes("T") ? cleaned : `${cleaned.replace(" ", "T")}Z`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** FNV-1a → base36, for a stable id when a row has no usable URN. */
function hash36(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Pull the numeric activity/share id out of a LinkedIn post URL if present. */
function shareIdFromLink(link: string): string | null {
  const match = (link ?? "").match(/(\d{8,})/); // activity/share ids are long
  return match ? match[1] : null;
}

/**
 * Parse one CSV from a LinkedIn export into normalized archive items.
 * Auto-detects Shares.csv (has a "ShareCommentary" column) vs Comments.csv
 * (has a "Message" column). Returns [] for any other file in the export.
 */
export function parseLinkedInExportCsv(text: string): NormalizedItem[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const find = (pred: (h: string) => boolean) => header.findIndex(pred);

  const iCommentary = find((h) => h.includes("commentary"));
  const iMessage = find((h) => h === "message" || h.includes("message"));
  const iDate = find((h) => h.includes("date"));

  // --- Shares.csv → posts ---
  if (iCommentary !== -1) {
    const iShareLink = find((h) => h.includes("sharelink"));
    const iSharedUrl = find((h) => h.includes("sharedurl"));
    const items: NormalizedItem[] = [];

    for (const row of rows.slice(1)) {
      const commentary = (row[iCommentary] ?? "").trim();
      const sharedUrl = iSharedUrl !== -1 ? (row[iSharedUrl] ?? "").trim() : "";
      const link = iShareLink !== -1 ? (row[iShareLink] ?? "").trim() : "";
      const body = commentary || sharedUrl;
      if (!body) continue; // reshare with no words of your own — skip

      const dateRaw = iDate !== -1 ? row[iDate] ?? "" : "";
      const id = shareIdFromLink(link) ?? hash36(`${dateRaw}|${body}`);

      items.push({
        platform_item_id: `li_${id}`.slice(0, 40),
        kind: "post",
        source_title: "LinkedIn post",
        body: body.slice(0, 40000),
        url: /^https?:\/\//i.test(link) ? link : null,
        topics: [],
        engagement: { likes: 0, comments: 0 },
        published_at: parseLinkedInDate(dateRaw),
      });
    }
    return items;
  }

  // --- Comments.csv → comments ---
  if (iMessage !== -1) {
    const iLink = find((h) => h.includes("link"));
    const items: NormalizedItem[] = [];

    for (const row of rows.slice(1)) {
      const message = (row[iMessage] ?? "").trim();
      if (!message) continue;

      const link = iLink !== -1 ? (row[iLink] ?? "").trim() : "";
      const dateRaw = iDate !== -1 ? row[iDate] ?? "" : "";

      items.push({
        platform_item_id: `lic_${hash36(`${dateRaw}|${message}`)}`.slice(0, 40),
        kind: "comment",
        source_title: "LinkedIn comment",
        body: message.slice(0, 40000),
        url: /^https?:\/\//i.test(link) ? link : null,
        topics: [],
        engagement: { likes: 0, comments: 0 },
        published_at: parseLinkedInDate(dateRaw),
      });
    }
    return items;
  }

  return [];
}

/** File names inside the LinkedIn export ZIP that we want to parse. */
export function isLinkedInExportFile(baseName: string): boolean {
  const n = baseName.toLowerCase();
  return n === "shares.csv" || n === "comments.csv";
}
