"use client";

import type { Post } from "../../app/data/mockPosts";
import { ARCHIVE_ITEM_COLUMNS, postFromRow, type ArchiveItemRow } from "../archive/client";
import { createClient } from "../supabase/client";

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  updatedAt: string;
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  collection_items?: { count: number }[];
}

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    updatedAt: row.updated_at,
    itemCount: row.collection_items?.[0]?.count ?? 0,
  };
}

async function requireUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in.");
  return data.user.id;
}

export async function listCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, description, is_public, updated_at, collection_items(count)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CollectionRow[]).map(toCollection);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, description, is_public, updated_at, collection_items(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toCollection(data as CollectionRow) : null;
}

export async function createCollection(name: string, description: string): Promise<Collection> {
  const userId = await requireUserId();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name: name.trim(), description: description.trim() || null })
    .select("id, name, description, is_public, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return toCollection(data as CollectionRow);
}

export async function updateCollection(
  id: string,
  patch: { name?: string; description?: string; isPublic?: boolean },
) {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim() || null;
  if (patch.isPublic !== undefined) payload.is_public = patch.isPublic;
  const { error } = await supabase.from("collections").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCollection(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCollectionItems(collectionId: string): Promise<Post[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select(`archive_item_id, created_at, archive_items(${ARCHIVE_ITEM_COLUMNS})`)
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  // PostgREST returns the to-one `archive_items` embed as a single object at
  // runtime; the inferred type is looser, so cast through `unknown`.
  return ((data ?? []) as unknown as { archive_items: ArchiveItemRow | null }[])
    .map((row) => row.archive_items)
    .filter((item): item is ArchiveItemRow => Boolean(item))
    .map(postFromRow);
}

export async function addItemToCollection(collectionId: string, archiveItemId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_items")
    .upsert({ collection_id: collectionId, archive_item_id: archiveItemId }, { onConflict: "collection_id,archive_item_id" });
  if (error) throw new Error(error.message);
  await supabase.from("collections").update({ updated_at: new Date().toISOString() }).eq("id", collectionId);
}

export async function removeItemFromCollection(collectionId: string, archiveItemId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("archive_item_id", archiveItemId);
  if (error) throw new Error(error.message);
}

export async function getCollectionIdsForItem(archiveItemId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .select("collection_id")
    .eq("archive_item_id", archiveItemId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { collection_id: string }[]).map((row) => row.collection_id);
}
