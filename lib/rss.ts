// RSS / Atom import — the universal open feed. Covers Substack, Medium, Ghost,
// WordPress, Dev.to and any blog, no keys. Server-side only (feeds rarely send
// CORS headers, and this keeps parsing off the client).

import { htmlToText } from "./mastodon-shared";
import type { NormalizedItem } from "./reddit-shared";

const USER_AGENT = "web:preve:1.0 (personal content archive)";

class FatalRssError extends Error {}

export function isFatalRssError(error: unknown): boolean {
  return error instanceof FatalRssError;
}

function decodeEntities(s: string): string {
  return s
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
    });
}

function unwrapCdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1] : s;
}

/** Inner text of the first <name>…</name> (namespaced names like content:encoded ok). */
function firstTag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? unwrapCdata(m[1]).trim() : null;
}

// Entity-encoded HTML (&lt;p&gt;) → decode first so tags become strippable,
// then htmlToText removes tags and decodes the rest.
function contentToText(raw: string): string {
  return htmlToText(decodeEntities(raw));
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function extractLink(block: string): string | null {
  const rss = firstTag(block, "link");
  if (rss && /^https?:\/\//i.test(rss)) return rss;

  // Atom: <link href="…" rel="alternate"/>
  const links = [...block.matchAll(/<link\b([^>]*)>/gi)].map((m) => m[1]);
  let fallback: string | null = null;
  for (const attrs of links) {
    const href = (attrs.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const rel = (attrs.match(/rel\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!rel || rel.toLowerCase() === "alternate") return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function extractDate(block: string): string {
  const raw =
    firstTag(block, "pubDate") ||
    firstTag(block, "published") ||
    firstTag(block, "updated") ||
    firstTag(block, "dc:date") ||
    "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function extractCategories(block: string): string[] {
  const out: string[] = [];
  for (const m of block.matchAll(/<category\b([^>]*)>([\s\S]*?)<\/category>/gi)) {
    const val = unwrapCdata(m[2]).trim();
    if (val) out.push(decodeEntities(val).toLowerCase().slice(0, 40));
    if (out.length >= 5) break;
  }
  for (const m of block.matchAll(/<category\b([^>]*)\/>/gi)) {
    if (out.length >= 5) break;
    const term = (m[1].match(/term\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (term) out.push(term.toLowerCase().slice(0, 40));
  }
  return [...new Set(out)];
}

/** Parse an RSS 2.0 or Atom feed into normalized archive items. */
export function parseFeed(xml: string): NormalizedItem[] {
  const head = xml.slice(0, 2000).toLowerCase();
  const isAtom = /<feed[\s>]/.test(head) && !/<rss[\s>]/.test(head);
  const blockRe = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const blocks = xml.match(blockRe) || [];

  const items: NormalizedItem[] = [];
  for (const block of blocks) {
    const title = firstTag(block, "title") || "";
    const link = extractLink(block) || "";
    const rawContent =
      firstTag(block, "content:encoded") ||
      firstTag(block, "content") ||
      firstTag(block, "description") ||
      firstTag(block, "summary") ||
      "";

    const body = contentToText(rawContent) || decodeEntities(title);
    if (!body) continue;

    const guid = firstTag(block, "guid") || firstTag(block, "id") || link || title;
    items.push({
      platform_item_id: `rss_${guid}`.slice(0, 200),
      kind: "post",
      source_title: title ? decodeEntities(title) : null,
      body: body.slice(0, 40000),
      url: link || null,
      topics: extractCategories(block),
      engagement: { likes: 0, comments: 0 },
      published_at: extractDate(block),
    });
  }
  return items;
}

/** Feed title, for labeling the connection (e.g. the blog's name). */
export function parseFeedTitle(xml: string): string | null {
  // The channel/feed title is the first <title> before any item/entry.
  const upto = xml.split(/<item[\s>]|<entry[\s>]/i)[0];
  const t = firstTag(upto, "title");
  return t ? decodeEntities(t).slice(0, 80) : null;
}

function looksLikeFeed(text: string): boolean {
  const head = text.slice(0, 2000).toLowerCase();
  return /<rss[\s>]/.test(head) || /<feed[\s>]/.test(head) || head.includes("<rdf:rdf");
}

async function fetchText(url: string): Promise<{ ok: boolean; text: string; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8",
    },
  });
  const text = res.ok ? await res.text() : "";
  return { ok: res.ok, text, contentType: res.headers.get("content-type") ?? "" };
}

function findFeedLinkInHtml(html: string, baseUrl: string): string | null {
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (/type\s*=\s*["']application\/(rss|atom)\+xml/i.test(tag)) {
      const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
      if (href) return absolutize(href, baseUrl);
    }
  }
  return null;
}

/**
 * Turn whatever the user pasted (feed URL, or a site/blog URL) into feed XML:
 * direct feed → use it; HTML page → follow its feed <link>; otherwise try the
 * common feed paths.
 */
export async function resolveFeedText(input: string): Promise<string> {
  let url = input.trim();
  if (!url) throw new FatalRssError("Paste a blog or feed URL.");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const first = await fetchText(url).catch(() => null);
  if (first?.ok && looksLikeFeed(first.text)) return first.text;

  if (first?.ok && (first.contentType.includes("html") || first.text.toLowerCase().includes("<html"))) {
    const feedHref = findFeedLinkInHtml(first.text, url);
    if (feedHref) {
      const f = await fetchText(feedHref).catch(() => null);
      if (f?.ok && looksLikeFeed(f.text)) return f.text;
    }
  }

  const base = url.replace(/\/+$/, "");
  for (const path of ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml", "/index.xml", "/feed/"]) {
    const f = await fetchText(base + path).catch(() => null);
    if (f?.ok && looksLikeFeed(f.text)) return f.text;
  }

  throw new FatalRssError("Couldn't find a feed there. Paste the direct RSS/Atom feed URL.");
}
