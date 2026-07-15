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
 * Embed any of the user's archive items that don't have an embedding yet.
 * Returns how many were indexed. Cheap no-op once everything is embedded.
 */
export async function buildEmbeddings(limit = 200): Promise<number> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in.");

  const [{ data: items }, { data: existing }] = await Promise.all([
    supabase.from("archive_items").select("id, source_title, body").limit(1000),
    supabase.from("archive_embeddings").select("archive_item_id"),
  ]);

  const done = new Set(((existing ?? []) as { archive_item_id: string }[]).map((r) => r.archive_item_id));
  const missing = ((items ?? []) as { id: string; source_title: string | null; body: string }[])
    .filter((item) => !done.has(item.id))
    .slice(0, limit);
  if (missing.length === 0) return 0;

  const texts = missing.map((item) => `${item.source_title ?? ""}\n${item.body ?? ""}`.slice(0, 4000));
  const vectors = await embed(texts);
  const rows = missing.map((item, i) => ({ archive_item_id: item.id, user_id: userId, embedding: vectors[i] }));

  const { error } = await supabase.from("archive_embeddings").upsert(rows, { onConflict: "archive_item_id" });
  if (error) throw new Error(error.message);
  return rows.length;
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
