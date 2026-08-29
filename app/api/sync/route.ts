import { NextResponse } from "next/server";
import { upsertArchiveItems } from "../../../lib/archive/server";
import { fetchBlueskyPublicArchive } from "../../../lib/bluesky-shared";
import { fetchMastodonPublicArchive } from "../../../lib/mastodon-shared";
import { fetchHackerNewsArchive } from "../../../lib/hackernews";
import { fetchDevtoArchive } from "../../../lib/devto";
import { fetchLemmyArchive } from "../../../lib/lemmy-shared";
import { parseFeed, resolveFeedText } from "../../../lib/rss";
import { fetchRedditArchive, hasRedditEnv, refreshRedditToken } from "../../../lib/reddit";
import { openToken } from "../../../lib/crypto/tokens";
import type { NormalizedItem } from "../../../lib/reddit-shared";
import { createClient } from "../../../lib/supabase/server";

export const maxDuration = 60;

// Background "sync on open": re-pull each connected account when the user opens
// the app so new posts show up automatically. Kept light (only the most recent
// pages — new posts are always at the top) and throttled per account so it
// can't hammer the platforms on every reload.
const SYNC_PAGES = 2;
const THROTTLE_MS = 10 * 60_000; // don't re-sync an account synced < 10 min ago

interface AccountRow {
  platform: string;
  platform_username: string | null;
  last_sync_at: string | null;
  metadata: { refresh_token?: string | null } | null;
}

async function fetchForAccount(account: AccountRow): Promise<NormalizedItem[]> {
  const handle = (account.platform_username ?? "").trim();
  if (!handle) return [];

  switch (account.platform) {
    case "bluesky":
      return fetchBlueskyPublicArchive(handle, SYNC_PAGES);
    case "mastodon":
      return fetchMastodonPublicArchive(handle, SYNC_PAGES);
    case "hackernews":
      return fetchHackerNewsArchive(handle, SYNC_PAGES);
    case "devto":
      return fetchDevtoArchive(handle, SYNC_PAGES);
    case "lemmy":
      return fetchLemmyArchive(handle, SYNC_PAGES);
    case "rss": {
      const xml = await resolveFeedText(handle);
      return parseFeed(xml);
    }
    case "reddit": {
      // Only OAuth-connected Reddit can auto-sync (anonymous Reddit is walled).
      const sealed = account.metadata?.refresh_token;
      if (!sealed || !hasRedditEnv()) return [];
      const tokens = await refreshRedditToken(await openToken(sealed));
      return fetchRedditArchive(tokens.access_token, handle, SYNC_PAGES);
    }
    default:
      return [];
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const userId = userData.user.id;

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("platform, platform_username, last_sync_at, metadata")
    .eq("user_id", userId);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0 });
  }

  const now = Date.now();
  let synced = 0;
  let skipped = 0;

  for (const account of accounts as AccountRow[]) {
    const last = account.last_sync_at ? new Date(account.last_sync_at).getTime() : 0;
    if (now - last < THROTTLE_MS) {
      skipped++;
      continue;
    }
    try {
      const items = await fetchForAccount(account);
      if (items.length > 0) {
        await upsertArchiveItems(supabase, userId, account.platform, items);
      }
      await supabase
        .from("connected_accounts")
        .update({ status: "connected", last_sync_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("platform", account.platform);
      synced++;
    } catch {
      // One account failing must never break the rest of the sync.
    }
  }

  return NextResponse.json({ synced, skipped });
}
