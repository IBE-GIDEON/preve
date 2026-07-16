// Keyless Reddit import that runs IN THE USER'S BROWSER. Reddit's public
// listing endpoints send CORS headers, so the fetch happens from the user's
// own residential IP + real browser — the path Reddit is least likely to
// bot-wall (server datacenter IPs sometimes are). Items are then handed to
// /api/import/reddit/ingest, which re-validates everything server-side.

import {
  normalizeComment,
  normalizeSubmitted,
  type NormalizedItem,
  type RedditListing,
} from "./reddit-shared";

// old.reddit.com doesn't send CORS headers — browser path uses these two.
const BROWSER_HOSTS = ["https://www.reddit.com", "https://api.reddit.com"];

class FatalRedditError extends Error {}

async function fetchListingInBrowser(
  username: string,
  type: "submitted" | "comments",
  after?: string,
): Promise<RedditListing> {
  const params = new URLSearchParams({ limit: "100", raw_json: "1" });
  if (after) params.set("after", after);

  let lastError: Error | null = null;
  for (const host of BROWSER_HOSTS) {
    const path =
      host === "https://api.reddit.com" ? `/user/${username}/${type}` : `/user/${username}/${type}.json`;
    try {
      const res = await fetch(`${host}${path}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        mode: "cors",
        credentials: "omit",
      });
      if (res.status === 404) throw new FatalRedditError("That Reddit username doesn't exist.");
      if (!res.ok) {
        lastError = new Error(`Reddit answered ${res.status}.`);
        continue;
      }
      if (!(res.headers.get("content-type") ?? "").includes("json")) {
        lastError = new Error("Reddit served a non-JSON page.");
        continue;
      }
      return (await res.json()) as RedditListing;
    } catch (error) {
      if (error instanceof FatalRedditError) throw error;
      // CORS rejection or network failure surfaces as a TypeError — try next host.
      lastError = error instanceof Error ? error : new Error("Network error.");
    }
  }
  throw lastError ?? new Error("Couldn't reach Reddit from your browser.");
}

export function isFatalRedditError(error: unknown): boolean {
  return error instanceof FatalRedditError;
}

/** Fetch a user's PUBLIC posts + comments straight from the browser. */
export async function fetchRedditPublicArchiveInBrowser(
  username: string,
  maxPagesPerType = 10,
): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];

  for (const type of ["submitted", "comments"] as const) {
    let after: string | undefined;
    for (let page = 0; page < maxPagesPerType; page++) {
      const listing = await fetchListingInBrowser(username, type, after);
      for (const child of listing.data.children) {
        items.push(type === "submitted" ? normalizeSubmitted(child.data) : normalizeComment(child.data));
      }
      if (!listing.data.after) break;
      after = listing.data.after;
    }
  }

  return items;
}
