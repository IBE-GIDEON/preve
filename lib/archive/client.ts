"use client";

import type { Platform, Post, PostKind } from "../../app/data/mockPosts";
import { createClient } from "../supabase/client";

type DbPlatform =
  | "reddit"
  | "x"
  | "linkedin"
  | "bluesky"
  | "mastodon"
  | "rss"
  | "hackernews"
  | "devto"
  | "lemmy";
type DbKind = "post" | "comment" | "thread" | "article";

export interface ArchiveItemRow {
  id: string;
  platform: DbPlatform;
  kind: DbKind;
  source_title: string | null;
  body: string;
  url: string | null;
  topics: string[] | null;
  summary: string | null;
  engagement: Record<string, number> | null;
  published_at: string | null;
  created_at: string;
}

/** Column list for selecting an archive item row (shared across features). */
export const ARCHIVE_ITEM_COLUMNS =
  "id, platform, kind, source_title, body, url, topics, summary, engagement, published_at, created_at";

export interface ArchiveLoadResult {
  posts: Post[];
  savedPostIds: string[];
}

export interface ManualImportInput {
  platform: Platform;
  kind: PostKind;
  sourceTitle: string;
  rawText: string;
}

const platformToDb: Record<Platform, DbPlatform> = {
  Reddit: "reddit",
  X: "x",
  LinkedIn: "linkedin",
  Bluesky: "bluesky",
  Mastodon: "mastodon",
  RSS: "rss",
  HackerNews: "hackernews",
  Devto: "devto",
  Lemmy: "lemmy",
};

const platformFromDb: Record<DbPlatform, Platform> = {
  reddit: "Reddit",
  x: "X",
  linkedin: "LinkedIn",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  rss: "RSS",
  hackernews: "HackerNews",
  devto: "Devto",
  lemmy: "Lemmy",
};

const kindToDb: Record<PostKind, DbKind> = {
  Post: "post",
  Comment: "comment",
  Thread: "thread",
  Article: "article",
};

const kindFromDb: Record<DbKind, PostKind> = {
  post: "Post",
  comment: "Comment",
  thread: "Thread",
  article: "Article",
};

const TOPIC_KEYWORDS: Array<[string, string[]]> = [
  ["AI", ["ai", "llm", "model", "openai", "agent", "automation"]],
  ["Startup", ["startup", "founder", "saas", "mvp", "customer", "launch"]],
  ["React", ["react", "next.js", "nextjs", "hooks", "component"]],
  ["Stripe", ["stripe", "payment", "checkout", "billing", "webhook"]],
  ["Docker", ["docker", "container", "image", "ci", "deploy"]],
  ["Content", ["content", "post", "newsletter", "linkedin", "twitter", "reddit"]],
  ["Product", ["product", "feature", "workflow", "ux", "user"]],
];

function formatRelativeDate(value: string | null) {
  if (!value) return "Undated";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.max(0, Math.round(diffMs / dayMs));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

function makeSummary(body: string) {
  const firstSentence = body.split(/[.!?]\s/)[0]?.trim();
  const summary = firstSentence || body.trim();
  return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary;
}

function detectTopics(body: string) {
  const lower = body.toLowerCase();
  const topics = TOPIC_KEYWORDS.filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword))).map(
    ([topic]) => topic,
  );

  return topics.length > 0 ? Array.from(new Set(topics)).slice(0, 5) : ["Imported"];
}

function splitImportText(rawText: string) {
  return rawText
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function postFromRow(row: ArchiveItemRow): Post {
  return {
    id: row.id,
    platform: platformFromDb[row.platform],
    kind: kindFromDb[row.kind],
    content: row.body,
    summary: row.summary || makeSummary(row.body),
    sourceTitle: row.source_title || "Manual import",
    date: formatRelativeDate(row.published_at || row.created_at),
    publishedAt: row.published_at || row.created_at,
    url: row.url || "",
    engagement: row.engagement || {},
    topics: row.topics?.length ? row.topics : detectTopics(row.body),
  };
}

async function getUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("You must be signed in to use your archive.");
  }

  return data.user.id;
}

// Stale-while-revalidate: paint instantly from the last snapshot (per user,
// per tab), then refresh from the network and update in place. This is what
// makes the dashboard feel native-fast on every repeat visit.
const ARCHIVE_CACHE_PREFIX = "preve:archive:";

async function archiveCacheKey(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession(); // local read — no network
    const uid = data.session?.user?.id;
    return uid ? `${ARCHIVE_CACHE_PREFIX}${uid}` : null;
  } catch {
    return null;
  }
}

export async function loadArchivePostsCached(
  apply: (result: ArchiveLoadResult, fresh: boolean) => void,
): Promise<void> {
  let key: string | null = null;
  try {
    key = await archiveCacheKey();
    const raw = key ? sessionStorage.getItem(key) : null;
    if (raw) apply(JSON.parse(raw) as ArchiveLoadResult, false);
  } catch {
    // cache is best-effort only
  }

  const result = await loadArchivePosts();
  apply(result, true);
  try {
    if (key) sessionStorage.setItem(key, JSON.stringify(result));
  } catch {
    // storage full/unavailable — skip caching
  }
}

export async function loadArchivePosts(): Promise<ArchiveLoadResult> {
  const supabase = createClient();

  const [{ data: archiveItems, error: archiveError }, { data: savedItems, error: savedError }] = await Promise.all([
    supabase
      .from("archive_items")
      .select(ARCHIVE_ITEM_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("saved_archive_items").select("archive_item_id"),
  ]);

  if (archiveError) throw new Error(archiveError.message);
  if (savedError) throw new Error(savedError.message);

  return {
    posts: ((archiveItems || []) as ArchiveItemRow[]).map(postFromRow),
    savedPostIds: (savedItems || []).map((item) => item.archive_item_id as string),
  };
}

/**
 * Accurate per-platform item counts straight from the DB (not the loaded cache),
 * so the platform filter/list reflect everything the user imported. One cheap
 * head-count per platform, run in parallel.
 */
export async function getArchivePlatformCounts(): Promise<Record<Platform, number>> {
  const supabase = createClient();
  const platforms = Object.keys(platformToDb) as Platform[];
  const entries = await Promise.all(
    platforms.map(async (platform) => {
      const { count } = await supabase
        .from("archive_items")
        .select("*", { count: "exact", head: true })
        .eq("platform", platformToDb[platform]);
      return [platform, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Platform, number>;
}

/**
 * One page of the archive for the browse view, straight from the DB (so browse
 * isn't limited to the cached snapshot). Newest first; optional platform filter.
 */
export async function browseArchive(
  platform: Platform | "all",
  offset: number,
  limit = 30,
  kind: PostKind | "all" = "all",
  days: number | "all" = "all",
): Promise<Post[]> {
  const supabase = createClient();
  let request = supabase
    .from("archive_items")
    .select(ARCHIVE_ITEM_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (platform !== "all") request = request.eq("platform", platformToDb[platform]);
  if (kind !== "all") request = request.eq("kind", kindToDb[kind]);
  if (days !== "all") {
    request = request.gte("published_at", new Date(Date.now() - days * 86_400_000).toISOString());
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return ((data ?? []) as ArchiveItemRow[]).map(postFromRow);
}

export async function importManualArchive(input: ManualImportInput) {
  const userId = await getUserId();
  const supabase = createClient();
  const items = splitImportText(input.rawText);

  if (items.length === 0) {
    throw new Error("Paste at least one post or comment before importing.");
  }

  const now = new Date().toISOString();
  const dbPlatform = platformToDb[input.platform];
  const importBatchId =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());

  const rows = items.map((body, index) => ({
    user_id: userId,
    platform: dbPlatform,
    platform_item_id: `manual-${importBatchId}-${index}`,
    kind: kindToDb[input.kind],
    source_title: input.sourceTitle || "Manual import",
    body,
    url: null,
    topics: detectTopics(body),
    summary: makeSummary(body),
    engagement: {},
    metadata: { import_source: "manual_paste" },
    published_at: now,
  }));

  const { error } = await supabase.from("archive_items").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: dbPlatform,
      platform_username: "Manual import",
      status: "connected",
      last_sync_at: now,
      metadata: { import_source: "manual_paste" },
    },
    { onConflict: "user_id,platform" },
  );

  await supabase.from("import_jobs").insert({
    user_id: userId,
    platform: dbPlatform,
    status: "completed",
    total_items: rows.length,
    imported_items: rows.length,
    started_at: now,
    completed_at: now,
  });

  return rows.length;
}

/** Clear the stale-while-revalidate snapshot (call after a destructive change). */
export async function clearArchiveCache(): Promise<void> {
  try {
    const key = await archiveCacheKey();
    if (key) sessionStorage.removeItem(key);
  } catch {
    // best-effort
  }
}

/**
 * Delete every imported item for one platform (RLS-scoped to the caller) and
 * reset that platform's connection + import log. Embeddings and saved rows are
 * removed automatically via ON DELETE CASCADE. Returns the number deleted.
 */
export async function deleteArchiveByPlatform(platform: Platform): Promise<number> {
  const userId = await getUserId();
  const supabase = createClient();
  const dbPlatform = platformToDb[platform];

  const { error, count } = await supabase
    .from("archive_items")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("platform", dbPlatform);
  if (error) throw new Error(error.message);

  // Reset the connection + import history for that platform (best-effort).
  await supabase.from("connected_accounts").delete().eq("user_id", userId).eq("platform", dbPlatform);
  await supabase.from("import_jobs").delete().eq("user_id", userId).eq("platform", dbPlatform);

  await clearArchiveCache();
  return count ?? 0;
}

export async function toggleArchiveItemSaved(archiveItemId: string, shouldSave: boolean) {
  const userId = await getUserId();
  const supabase = createClient();

  if (shouldSave) {
    const { error } = await supabase.from("saved_archive_items").upsert(
      {
        user_id: userId,
        archive_item_id: archiveItemId,
      },
      { onConflict: "user_id,archive_item_id" },
    );
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("saved_archive_items")
    .delete()
    .eq("user_id", userId)
    .eq("archive_item_id", archiveItemId);
  if (error) throw new Error(error.message);
}

export function getArchiveStats(posts: Post[]) {
  const platformCounts = posts.reduce(
    (counts, post) => {
      counts[post.platform] += 1;
      return counts;
    },
    { Reddit: 0, X: 0, LinkedIn: 0, Bluesky: 0, Mastodon: 0, RSS: 0, HackerNews: 0, Devto: 0, Lemmy: 0 } satisfies Record<Platform, number>,
  );

  return {
    indexed: posts.length,
    platformCounts,
  };
}

export function getSimilarArchivePosts(posts: Post[], selectedPost: Post, limit = 3) {
  return posts
    .filter((post) => post.id !== selectedPost.id)
    .map((post) => ({
      post,
      sharedTopics: post.topics.filter((topic) => selectedPost.topics.includes(topic)).length,
    }))
    .filter((item) => item.sharedTopics > 0)
    .sort((a, b) => b.sharedTopics - a.sharedTopics)
    .slice(0, limit)
    .map((item) => item.post);
}
