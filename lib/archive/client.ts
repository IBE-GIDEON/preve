"use client";

import type { Platform, Post, PostKind } from "../../app/data/mockPosts";
import { createClient } from "../supabase/client";

type DbPlatform = "reddit" | "x" | "linkedin";
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
};

const platformFromDb: Record<DbPlatform, Platform> = {
  reddit: "Reddit",
  x: "X",
  linkedin: "LinkedIn",
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

export async function loadArchivePosts(): Promise<ArchiveLoadResult> {
  const supabase = createClient();

  const [{ data: archiveItems, error: archiveError }, { data: savedItems, error: savedError }] = await Promise.all([
    supabase
      .from("archive_items")
      .select(ARCHIVE_ITEM_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("saved_archive_items").select("archive_item_id"),
  ]);

  if (archiveError) throw new Error(archiveError.message);
  if (savedError) throw new Error(savedError.message);

  return {
    posts: ((archiveItems || []) as ArchiveItemRow[]).map(postFromRow),
    savedPostIds: (savedItems || []).map((item) => item.archive_item_id as string),
  };
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
    { Reddit: 0, X: 0, LinkedIn: 0 } satisfies Record<Platform, number>,
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
