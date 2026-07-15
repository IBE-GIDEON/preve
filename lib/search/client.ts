"use client";

import type { Platform, Post, PostKind } from "../../app/data/mockPosts";
import { ARCHIVE_ITEM_COLUMNS, postFromRow, type ArchiveItemRow } from "../archive/client";
import { createClient } from "../supabase/client";

export interface SearchParams {
  query: string;
  platform: Platform | "all";
  kind: PostKind | "all";
  days: number | "all";
  limit?: number;
}

export interface SearchResult {
  posts: Post[];
  total: number;
}

/**
 * Server-side keyword search over the user's whole archive (RLS-scoped to them).
 * Keyword match runs in Postgres via ILIKE on title + body; platform/type/date
 * are real DB filters. Returns the top `limit` matches plus the true total.
 */
export async function searchArchive({
  query,
  platform,
  kind,
  days,
  limit = 100,
}: SearchParams): Promise<SearchResult> {
  const supabase = createClient();
  let request = supabase.from("archive_items").select(ARCHIVE_ITEM_COLUMNS, { count: "exact" });

  // Strip characters that would break the PostgREST or-filter, then match.
  const safe = query.replace(/[%_,()*\\]/g, " ").trim();
  if (safe) {
    request = request.or(`body.ilike.%${safe}%,source_title.ilike.%${safe}%`);
  }
  if (platform !== "all") request = request.eq("platform", platform.toLowerCase());
  if (kind !== "all") request = request.eq("kind", kind.toLowerCase());
  if (days !== "all") {
    request = request.gte("published_at", new Date(Date.now() - days * 86_400_000).toISOString());
  }

  request = request.order("published_at", { ascending: false }).limit(limit);

  const { data, count, error } = await request;
  if (error) throw new Error(error.message);

  const posts = ((data ?? []) as ArchiveItemRow[]).map(postFromRow);
  return { posts, total: count ?? posts.length };
}
