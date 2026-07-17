import type { Platform } from "../data/mockPosts";

export type PlatformStatus = "connected" | "disconnected" | "importing";

export interface PlatformConnection {
  platform: Platform;
  status: PlatformStatus;
  posts: number;
  comments: number;
  lastSync: string;
}

export interface PreveState {
  onboarded: boolean;
  savedPostIds: string[];
  savedSearches: string[];
  recentSearches: string[];
  platforms: Record<Platform, PlatformConnection>;
}

const LEGACY_STORAGE_KEY = "preve:mvp-state";
const STORAGE_KEY = "preve:launch-state-v1";

export const PLATFORM_ORDER: Platform[] = ["Reddit", "Bluesky", "Mastodon", "RSS", "X", "LinkedIn"];

export const PLATFORM_TOTALS: Record<Platform, { posts: number; comments: number }> = {
  Reddit: { posts: 0, comments: 0 },
  Bluesky: { posts: 0, comments: 0 },
  Mastodon: { posts: 0, comments: 0 },
  RSS: { posts: 0, comments: 0 },
  X: { posts: 0, comments: 0 },
  LinkedIn: { posts: 0, comments: 0 },
};

export const DEFAULT_PREVE_STATE: PreveState = {
  onboarded: false,
  savedPostIds: [],
  savedSearches: [],
  recentSearches: [],
  platforms: {
    Reddit: {
      platform: "Reddit",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
    Bluesky: {
      platform: "Bluesky",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
    Mastodon: {
      platform: "Mastodon",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
    RSS: {
      platform: "RSS",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
    X: {
      platform: "X",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
    LinkedIn: {
      platform: "LinkedIn",
      status: "disconnected",
      posts: 0,
      comments: 0,
      lastSync: "Not connected",
    },
  },
};

function cloneDefaultState(): PreveState {
  return JSON.parse(JSON.stringify(DEFAULT_PREVE_STATE)) as PreveState;
}

function normalizeState(value: Partial<PreveState> | null): PreveState {
  const fallback = cloneDefaultState();
  if (!value || typeof value !== "object") return fallback;

  return {
    onboarded: Boolean(value.onboarded),
    savedPostIds: Array.isArray(value.savedPostIds) ? value.savedPostIds : fallback.savedPostIds,
    savedSearches: Array.isArray(value.savedSearches) ? value.savedSearches : fallback.savedSearches,
    recentSearches: Array.isArray(value.recentSearches) ? value.recentSearches : fallback.recentSearches,
    platforms: PLATFORM_ORDER.reduce((platforms, platform) => {
      platforms[platform] = {
        ...fallback.platforms[platform],
        ...(value.platforms?.[platform] || {}),
        platform,
      };
      return platforms;
    }, {} as Record<Platform, PlatformConnection>),
  };
}

export function getInitialPreveState(): PreveState {
  if (typeof window === "undefined") return cloneDefaultState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? (JSON.parse(raw) as Partial<PreveState>) : null);
  } catch {
    return cloneDefaultState();
  }
}

export function savePreveState(state: PreveState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetPreveState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function connectPlatform(state: PreveState, platform: Platform): PreveState {
  return {
    ...state,
    onboarded: true,
    platforms: {
      ...state.platforms,
      [platform]: {
        platform,
        status: "connected",
        posts: PLATFORM_TOTALS[platform].posts,
        comments: PLATFORM_TOTALS[platform].comments,
        lastSync: "Just now",
      },
    },
  };
}

export function markPlatformImporting(state: PreveState, platform: Platform): PreveState {
  return {
    ...state,
    platforms: {
      ...state.platforms,
      [platform]: {
        ...state.platforms[platform],
        platform,
        status: "importing",
        posts: PLATFORM_TOTALS[platform].posts,
        comments: PLATFORM_TOTALS[platform].comments,
        lastSync: "Importing",
      },
    },
  };
}

export function saveSearchQuery(state: PreveState, query: string): PreveState {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return state;

  const recentSearches = [
    cleanQuery,
    ...state.recentSearches.filter((item) => item.toLowerCase() !== cleanQuery.toLowerCase()),
  ].slice(0, 6);

  return { ...state, recentSearches };
}

export function addSavedSearch(state: PreveState, query: string): PreveState {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return state;

  return {
    ...state,
    savedSearches: [
      cleanQuery,
      ...state.savedSearches.filter((item) => item.toLowerCase() !== cleanQuery.toLowerCase()),
    ].slice(0, 8),
  };
}

export function toggleSavedPost(state: PreveState, postId: string): PreveState {
  const alreadySaved = state.savedPostIds.includes(postId);
  return {
    ...state,
    savedPostIds: alreadySaved
      ? state.savedPostIds.filter((id) => id !== postId)
      : [postId, ...state.savedPostIds].slice(0, 20),
  };
}

export function getIndexedTotals(state: PreveState) {
  const connectedPlatforms = PLATFORM_ORDER
    .map((platform) => state.platforms[platform])
    .filter((connection) => connection.status === "connected");

  const posts = connectedPlatforms.reduce((total, connection) => total + connection.posts, 0);
  const comments = connectedPlatforms.reduce((total, connection) => total + connection.comments, 0);

  return {
    posts,
    comments,
    indexed: posts + comments,
    platforms: connectedPlatforms.length,
  };
}
