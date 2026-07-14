"use client";

import { createClient } from "../supabase/client";

export interface SearchHistoryEntry {
  id: string;
  query: string;
  createdAt: string;
}

/** Fire-and-forget: record a search into the user's account-level history. */
export async function recordSearch(query: string): Promise<void> {
  const clean = query.trim();
  if (clean.length < 2) return;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("search_history").insert({ user_id: data.user.id, query: clean });
  } catch {
    // History is best-effort; never block search on it.
  }
}

export async function getSearchHistory(limit = 20): Promise<SearchHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("search_history")
    .select("id, query, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; query: string; created_at: string }[]).map((row) => ({
    id: row.id,
    query: row.query,
    createdAt: row.created_at,
  }));
}

export async function clearSearchHistory(): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from("search_history").delete().eq("user_id", data.user.id);
  if (error) throw new Error(error.message);
}
