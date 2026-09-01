"use client";

import type { Post } from "../../app/data/mockPosts";
import { postFromRow, type ArchiveItemRow } from "../archive/client";
import { createClient } from "../supabase/client";

/** Embed texts via the Supabase `embed` edge function (gte-small, 384-dim). */
async function embed(texts: string[]): Promise<number[][]> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("embed", { body: { texts } });
  if (error) throw new Error("The semantic index isn't set up yet.");
  return (data as { embeddings: number[][] }).embeddings;
}

/**
 * Embed any of the user's archive items that don't have an embedding yet, in
 * batches so a large archive is fully covered (not just the first 200). Returns
 * how many were indexed. Cheap no-op once everything is embedded.
 */
export async function buildEmbeddings(maxItems = 1000): Promise<number> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const [{ data: items }, { data: existing }] = await Promise.all([
    supabase.from("archive_items").select("id, source_title, body").limit(2000),
    supabase.from("archive_embeddings").select("archive_item_id"),
  ]);

  const done = new Set(((existing ?? []) as { archive_item_id: string }[]).map((r) => r.archive_item_id));
  const missing = ((items ?? []) as { id: string; source_title: string | null; body: string }[])
    .filter((item) => !done.has(item.id))
    .slice(0, maxItems);
  if (missing.length === 0) return 0;

  // Embed + upsert in batches (the edge function accepts up to 300 texts/call).
  const BATCH = 100;
  let indexed = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
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
