"use client";

import type { Post } from "../../app/data/mockPosts";
import { postFromRow, type ArchiveItemRow } from "../archive/client";
import { createClient } from "../supabase/client";

/** Embed texts via the Supabase `embed` edge function (gte-small, 384-dim). */
async function embed(texts: string[]): Promise<number[][]> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("embed", { body: { texts } });
  if (error) {
    // Surface the real reason (HTTP status + body) so failures are diagnosable
    // instead of a generic "not set up".
    let detail = error.message || "request failed";
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.status === "number") {
        detail = `HTTP ${ctx.status}`;
        const body = await ctx.clone().json().catch(() => null);
        if (body && typeof body.error === "string") detail += `: ${body.error.slice(0, 200)}`;
      }
    } catch {
      // best-effort detail extraction
    }
    throw new Error(`embed: ${detail}`);
  }
  const payload = data as { embeddings?: number[][] } | null;
  if (!payload?.embeddings) throw new Error("embed: no embeddings returned");
  return payload.embeddings;
}

/**
 * Embed any of the user's archive items that don't have an embedding yet, in
 * batches so a large archive is fully covered (not just the first 200). Returns
 * how many were indexed. Cheap no-op once everything is embedded.
 */
export async function buildEmbeddings(maxItems = 5000): Promise<number> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  // Fetch just the IDs (cheap) for the whole archive + everything already
  // embedded, so we compute the true missing set. Explicit high limits — the
  // default PostgREST cap is 1000, which was silently truncating both sides.
  const [{ data: items }, { data: existing }] = await Promise.all([
    supabase.from("archive_items").select("id").order("created_at", { ascending: false }).limit(20000),
    supabase.from("archive_embeddings").select("archive_item_id").limit(20000),
  ]);

  const done = new Set(((existing ?? []) as { archive_item_id: string }[]).map((r) => r.archive_item_id));
  const missingIds = ((items ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !done.has(id))
    .slice(0, maxItems);
  if (missingIds.length === 0) return 0;

  // Embed + upsert in batches (the edge function accepts up to 300 texts/call),
  // fetching each batch's text only when needed.
  const BATCH = 100;
  let indexed = 0;
  for (let i = 0; i < missingIds.length; i += BATCH) {
    const ids = missingIds.slice(i, i + BATCH);
    const { data: rowsData } = await supabase.from("archive_items").select("id, source_title, body").in("id", ids);
    const batch = (rowsData ?? []) as { id: string; source_title: string | null; body: string }[];
    if (batch.length === 0) continue;

    const texts = batch.map((item) => `${item.source_title ?? ""}\n${item.body ?? ""}`.slice(0, 4000));
    const vectors = await embed(texts);
    const rows = batch.map((item, j) => ({ archive_item_id: item.id, user_id: userId, embedding: vectors[j] }));
    const { error } = await supabase.from("archive_embeddings").upsert(rows, { onConflict: "archive_item_id" });
    if (error) throw new Error(error.message);
    indexed += rows.length;
  }
  return indexed;
}

/** Search by meaning: embed the query, then match against archive embeddings. */
export async function semanticSearch(query: string, limit = 30): Promise<Post[]> {
  const [vector] = await embed([query]);
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_archive_items", {
    query_embedding: vector,
    match_count: limit,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ArchiveItemRow[]).map(postFromRow);
}
