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
  const trimmed = query.trim();
  const since = days !== "all" ? new Date(Date.now() - Number(days) * 86_400_000).toISOString() : null;

  // Prefer ranked full-text search (stemming, phrases, relevance ordering).
  // Fall back to substring below when it finds nothing (prefixes/partials it
  // can't match) or when the FTS migration isn't applied yet.
  if (trimmed) {
    const { data, error } = await supabase.rpc("search_archive_fts", {
      q: trimmed,
      match_count: limit,
      platform_filter: platform !== "all" ? platform.toLowerCase() : null,
      kind_filter: kind !== "all" ? kind.toLowerCase() : null,
      since,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const posts = (data as ArchiveItemRow[]).map(postFromRow);
      return { posts, total: posts.length };
    }
  }

  // Substring fallback (ILIKE) — also catches prefixes/partials FTS misses.
  let request = supabase.from("archive_items").select(ARCHIVE_ITEM_COLUMNS, { count: "exact" });
  const safe = trimmed.replace(/[%_,()*\\]/g, " ").trim();
  if (safe) {
    request = request.or(`body.ilike.%${safe}%,source_title.ilike.%${safe}%`);
  }
  if (platform !== "all") request = request.eq("platform", platform.toLowerCase());
  if (kind !== "all") request = request.eq("kind", kind.toLowerCase());
  if (since) request = request.gte("published_at", since);

  request = request.order("published_at", { ascending: false }).limit(limit);

  const { data, count, error } = await request;
  if (error) throw new Error(error.message);

  const posts = ((data ?? []) as ArchiveItemRow[]).map(postFromRow);
  return { posts, total: count ?? posts.length };
}
