"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Post } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { DEFAULT_PREVE_STATE, getInitialPreveState, type PreveState } from "../../lib/preveState";
import { loadArchivePosts, toggleArchiveItemSaved } from "../../../lib/archive/client";

export default function SavedPage() {
  const [preveState, setPreveState] = useState<PreveState>(DEFAULT_PREVE_STATE);
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPreveState(getInitialPreveState());
    void loadSavedContent();
  }, []);

  const savedPosts = useMemo(
    () => archivePosts.filter((post) => savedPostIds.includes(post.id)),
    [archivePosts, savedPostIds],
  );
  const pinnedTopics = useMemo(
    () => Array.from(new Set(archivePosts.flatMap((post) => post.topics))).slice(0, 5),
    [archivePosts],
  );

  async function loadSavedContent() {
    try {
      setLoading(true);
      const result = await loadArchivePosts();
      setArchivePosts(result.posts);
      setSavedPostIds(result.savedPostIds);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load saved content.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSavedPost(postId: string) {
    setSavedPostIds((current) => current.filter((id) => id !== postId));

    try {
      await toggleArchiveItemSaved(postId, false);
    } catch (error) {
      setSavedPostIds((current) => [postId, ...current]);
      setMessage(error instanceof Error ? error.message : "Could not update saved content.");
    }
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "4rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Saved Content</h1>

          {message && <div style={{ color: "#F05522", marginBottom: "1rem", fontSize: "0.9rem" }}>{message}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div
              style={{
                background: "var(--background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "16px",
                padding: "1.5rem",
              }}
              className="hover-card"
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Favorite Searches</h3>
              <p style={{ opacity: 0.5, fontSize: "0.9rem", marginBottom: "1rem" }}>
                {preveState.savedSearches.length} saved searches
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {preveState.savedSearches.length > 0 ? (
                  preveState.savedSearches.slice(0, 4).map((search) => (
                    <Link
                      key={search}
                      href={`/dashboard/search?q=${encodeURIComponent(search)}`}
                      style={{ color: "var(--foreground)", opacity: 0.75, textDecoration: "none", fontSize: "0.9rem" }}
                    >
                      {search}
                    </Link>
                  ))
                ) : (
                  <div style={{ opacity: 0.55, fontSize: "0.9rem" }}>No saved searches yet</div>
                )}
              </div>
            </div>

            <div
              style={{
                background: "var(--background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "16px",
                padding: "1.5rem",
              }}
              className="hover-card"
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Favorite Posts</h3>
              <p style={{ opacity: 0.5, fontSize: "0.9rem", marginBottom: "1rem" }}>
                {loading ? "Loading..." : `${savedPosts.length} saved posts`}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {savedPosts.length > 0 ? (
                  savedPosts.slice(0, 3).map((post) => (
                    <button
                      key={post.id}
                      onClick={() => removeSavedPost(post.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--foreground)",
                        cursor: "pointer",
                        padding: 0,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ color: getPlatformColor(post.platform), fontSize: "0.8rem", fontWeight: 600 }}>
                        {post.platform}
                      </div>
                      <div style={{ opacity: 0.75, fontSize: "0.9rem" }}>{post.summary}</div>
                    </button>
                  ))
                ) : (
                  <Link
                    href="/dashboard"
                    style={{ color: "var(--foreground)", opacity: 0.65, textDecoration: "none", fontSize: "0.9rem" }}
                  >
                    Search your archive to save posts
                  </Link>
                )}
              </div>
            </div>

            <div
              style={{
                background: "var(--background)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "16px",
                padding: "1.5rem",
                gridColumn: "1 / -1",
              }}
              className="hover-card"
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Pinned Collections</h3>
              {pinnedTopics.length > 0 ? (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {pinnedTopics.map((topic) => (
                    <Link
                      key={topic}
                      href={`/dashboard/search?q=${encodeURIComponent(topic)}`}
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        borderRadius: "9999px",
                        color: "var(--foreground)",
                        fontSize: "0.85rem",
                        padding: "0.35rem 0.75rem",
                        textDecoration: "none",
                      }}
                    >
                      {topic}
                    </Link>
                  ))}
                </div>
              ) : (
                <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>
                  Collections appear after you import content into your archive.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <aside className="dashboard-right-sidebar">
        <div>
          <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
            Recent Searches
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {preveState.recentSearches.length > 0 ? (
              preveState.recentSearches.map((search) => (
                <Link
                  key={search}
                  href={`/dashboard/search?q=${encodeURIComponent(search)}`}
                  style={{ color: "var(--foreground)", opacity: 0.75, textDecoration: "none", fontSize: "0.9rem" }}
                >
                  {search}
                </Link>
              ))
            ) : (
              <div style={{ opacity: 0.55, fontSize: "0.9rem" }}>No recent searches yet</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
