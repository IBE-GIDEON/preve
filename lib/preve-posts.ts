"use client";

// Persists the "preve Posts" idea stack in localStorage so ideas are already
// WAITING on the next visit (no fresh AI call) and the nav can show a badge.
// Client-only; best-effort (never throws on storage failure).

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
const KEY = "preve:posts:v1";

export function loadStoredPosts(): StoredPosts | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPosts;
    if (!parsed || !Array.isArray(parsed.suggestions) || !Array.isArray(parsed.drafts)) return null;
    if (!Array.isArray(parsed.sources)) parsed.sources = [];
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredPosts(data: StoredPosts): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full/unavailable — ignore
  }
  window.dispatchEvent(new CustomEvent(PREVE_POSTS_EVENT));
}

export function clearStoredPosts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(PREVE_POSTS_EVENT));
}

export function countStoredPosts(): number {
  const stored = loadStoredPosts();
  return stored ? stored.suggestions.length : 0;
}
