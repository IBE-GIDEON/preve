"use client";

// Persists the "preve Posts" idea stack in localStorage, namespaced per user, so
// ideas are already WAITING on the next visit (no fresh AI call) and the nav can
// show a badge — without leaking one account's drafts to another on a shared
// browser. Client-only; best-effort (never throws on storage failure).

import { createClient } from "./supabase/client";

export interface StoredSourceRef {
  id: string;
  text: string;
  platform: string;
  date: string;
}

export interface StoredSuggestion {
  source: number; // 1-based index into `sources`
  platform: string;
  post: string;
}

export interface StoredPosts {
  sources: StoredSourceRef[];
  suggestions: StoredSuggestion[];
  drafts: string[];
}

export const PREVE_POSTS_EVENT = "preve:posts-changed";
const PREFIX = "preve:posts:v1:";

/** The current user's storage key, or null if signed out. Local read only. */
async function keyForUser(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession(); // reads local session, no network
    const uid = data.session?.user?.id;
    return uid ? `${PREFIX}${uid}` : null;
  } catch {
    return null;
  }
}

export async function loadStoredPosts(): Promise<StoredPosts | null> {
  if (typeof window === "undefined") return null;
  const key = await keyForUser();
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPosts;
    if (!parsed || !Array.isArray(parsed.suggestions) || !Array.isArray(parsed.drafts)) return null;
    if (!Array.isArray(parsed.sources)) parsed.sources = [];
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStoredPosts(data: StoredPosts): Promise<void> {
  if (typeof window === "undefined") return;
  const key = await keyForUser();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage full/unavailable — ignore
  }
  window.dispatchEvent(new CustomEvent(PREVE_POSTS_EVENT));
}

export async function clearStoredPosts(): Promise<void> {
  if (typeof window === "undefined") return;
  const key = await keyForUser();
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(PREVE_POSTS_EVENT));
}

export async function countStoredPosts(): Promise<number> {
  const stored = await loadStoredPosts();
  return stored ? stored.suggestions.length : 0;
}
