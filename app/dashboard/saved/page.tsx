"use client";

import { motion } from "framer-motion";
import { Clock, FolderOpen, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Post } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { getArchiveStats, loadArchivePosts, toggleArchiveItemSaved } from "../../../lib/archive/client";
import { listCollections, type Collection } from "../../../lib/collections/client";
import {
  clearSearchHistory,
  getSearchHistory,
  type SearchHistoryEntry,
} from "../../../lib/workspace/client";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function LibraryPage() {
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [archive, cols, hist] = await Promise.all([
        loadArchivePosts(),
        listCollections().catch(() => []),
        getSearchHistory(12).catch(() => []),
      ]);
      setArchivePosts(archive.posts);
      setSavedPostIds(archive.savedPostIds);
      setCollections(cols);
      setHistory(hist);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your library.");
    } finally {
      setLoading(false);
    }
  }

  const savedPosts = useMemo(
    () => archivePosts.filter((post) => savedPostIds.includes(post.id)),
    [archivePosts, savedPostIds],
  );
  const stats = useMemo(() => getArchiveStats(archivePosts), [archivePosts]);
  const connectedPlatforms = Object.values(stats.platformCounts).filter((count) => count > 0).length;

  async function removeSaved(postId: string) {
    const previous = savedPostIds;
    setSavedPostIds((ids) => ids.filter((id) => id !== postId));
    try {
      await toggleArchiveItemSaved(postId, false);
    } catch {
      setSavedPostIds(previous);
    }
  }

  async function handleClearHistory() {
    setHistory([]);
    try {
      await clearSearchHistory();
    } catch {
      void load();
    }
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.75rem" }}>Your library</h1>

          {message && <p className="auth-field-error" style={{ marginBottom: "1rem" }}>{message}</p>}

          {/* Import statistics */}
          <section className="settings-section">
            <h2 className="settings-section-title">Import statistics</h2>
            <div className="library-stats">
              <div><strong>{stats.indexed.toLocaleString()}</strong><span>Indexed items</span></div>
              <div><strong>{connectedPlatforms}</strong><span>Sources</span></div>
              <div><strong>{savedPosts.length}</strong><span>Saved</span></div>
              <div><strong>{collections.length}</strong><span>Collections</span></div>
            </div>
          </section>

          {/* Collections preview */}
          <section className="settings-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="settings-section-title" style={{ margin: 0 }}>Collections</h2>
              <Link href="/dashboard/collections" className="auth-inline-link">View all</Link>
            </div>
            {collections.length === 0 ? (
              <Link href="/dashboard/collections" className="settings-ghost-btn" style={{ display: "inline-flex" }}>
                <Plus size={15} /> Create a collection
              </Link>
            ) : (
              <div className="collections-grid">
                {collections.slice(0, 4).map((collection) => (
                  <Link key={collection.id} href={`/dashboard/collections/${collection.id}`} className="collection-card">
                    <div className="collection-card-icon"><FolderOpen size={18} /></div>
                    <div style={{ fontWeight: 600 }}>{collection.name}</div>
                    <div className="collection-card-meta">{collection.itemCount} items</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Saved items */}
          <section className="settings-section">
            <h2 className="settings-section-title">Saved items</h2>
            {loading ? (
              <p className="settings-muted">Loading…</p>
            ) : savedPosts.length === 0 ? (
              <p className="settings-muted">
                Nothing saved yet. <Link href="/dashboard" className="auth-inline-link">Search your archive</Link> and save posts.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {savedPosts.slice(0, 8).map((post) => (
                  <div key={post.id} className="collection-item">
                    <span className="collection-plat" style={{ color: getPlatformColor(post.platform) }}>{post.platform}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="collection-item-text">{post.summary}</div>
                      <div className="settings-muted" style={{ fontSize: "0.78rem" }}>{post.date}</div>
                    </div>
                    <button className="collection-remove" aria-label="Remove from saved" onClick={() => removeSaved(post.id)}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Search history */}
          <section className="settings-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="settings-section-title" style={{ margin: 0 }}>Search history</h2>
              {history.length > 0 && (
                <button className="auth-inline-link" onClick={handleClearHistory} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="settings-muted">Your recent searches will appear here.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.map((entry) => (
                  <Link key={entry.id} href={`/dashboard?q=${encodeURIComponent(entry.query)}`} className="library-history-row">
                    <Clock size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.query}</span>
                    <span className="settings-muted" style={{ fontSize: "0.78rem" }}>{timeAgo(entry.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </motion.div>
      </main>
    </div>
  );
}
