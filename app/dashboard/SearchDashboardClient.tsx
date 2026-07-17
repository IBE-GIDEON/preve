"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getEngagementScore,
  getPlatformColor,
  type Platform,
  type Post,
  type PostKind,
} from "../data/mockPosts";
import { searchArchive } from "../../lib/search/client";
import { buildEmbeddings, semanticSearch } from "../../lib/semantic/client";
import {
  addSavedSearch,
  DEFAULT_PREVE_STATE,
  getInitialPreveState,
  PLATFORM_ORDER,
  savePreveState,
  saveSearchQuery,
  type PreveState,
} from "../lib/preveState";
import { recordSearch } from "../../lib/workspace/client";
import {
  getArchiveStats,
  getSimilarArchivePosts,
  loadArchivePostsCached,
  toggleArchiveItemSaved,
} from "../../lib/archive/client";
import {
  addItemToCollection,
  createCollection,
  getCollectionIdsForItem,
  listCollections,
  removeItemFromCollection,
  type Collection,
} from "../../lib/collections/client";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getPlatformLabel(platform: Platform) {
  return platform === "X" ? "X" : platform;
}

export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");
  const [filterKind, setFilterKind] = useState<PostKind | "all">("all");
  const [filterDays, setFilterDays] = useState<"all" | "7" | "30" | "90" | "365">("all");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [indexing, setIndexing] = useState(false);
  const embeddedRef = useRef(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedRewrite, setGeneratedRewrite] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiUsage, setAiUsage] = useState<{ remaining: number; limit: number } | null>(null);
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [preveState, setPreveState] = useState<PreveState>(DEFAULT_PREVE_STATE);
  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [postCollectionIds, setPostCollectionIds] = useState<string[]>([]);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [collectionBusy, setCollectionBusy] = useState<string | null>(null);
  const [collectionError, setCollectionError] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreveState(getInitialPreveState());
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setSearchValue(query);

    loadArchive();
  }, []);

  // Only platforms the user actually has content on (dropdowns stay honest).
  const platformsWithContent = useMemo(
    () => PLATFORM_ORDER.filter((platform) => archivePosts.some((post) => post.platform === platform)),
    [archivePosts],
  );

  // If the selected platform disappears from the archive, fall back to All.
  useEffect(() => {
    if (filterPlatform !== "all" && archivePosts.length > 0 && !platformsWithContent.includes(filterPlatform)) {
      setFilterPlatform("all");
    }
  }, [filterPlatform, platformsWithContent, archivePosts.length]);

  useEffect(() => {
    if (searchValue === "") setSelectedPost(null);
  }, [searchValue]);

  useEffect(() => {
    setCopied(false);
    setGeneratedRewrite("");
    setAiError("");
  }, [selectedPost?.id]);

  // Which collections already hold the selected post (drives the ✓ states).
  useEffect(() => {
    setCollectionsOpen(false);
    setCollectionError("");
    if (!selectedPost) {
      setPostCollectionIds([]);
      return;
    }
    getCollectionIdsForItem(selectedPost.id)
      .then(setPostCollectionIds)
      .catch(() => setPostCollectionIds([]));
  }, [selectedPost?.id]);

  async function runAi(action: string, format?: string) {
    if (!selectedPost || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setGeneratedRewrite("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, format, text: selectedPost.content }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.usage) setAiUsage({ remaining: data.usage.remaining, limit: data.usage.limit });
      if (!res.ok) throw new Error(data.error || "AI request failed.");
      setGeneratedRewrite(data.result || "");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    const cleanQuery = searchValue.trim();
    if (cleanQuery.length < 2) return;

    const timeout = window.setTimeout(() => {
      updatePreveState((state) => saveSearchQuery(state, cleanQuery));
      void recordSearch(cleanQuery);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  async function loadArchive() {
    try {
      setArchiveLoading(true);
      setArchiveMessage("");
      // Cached snapshot paints instantly; fresh data replaces it in place.
      await loadArchivePostsCached((result) => {
        setArchivePosts(result.posts);
        setSavedPostIds(result.savedPostIds);
        setArchiveLoading(false);
      });
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "Could not load your archive.");
    } finally {
      setArchiveLoading(false);
    }
  }

  function updatePreveState(updater: (state: PreveState) => PreveState) {
    setPreveState((current) => {
      const next = updater(current);
      savePreveState(next);
      return next;
    });
  }


  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleSavePost() {
    if (!selectedPost) return;
    const shouldSave = !savedPostIds.includes(selectedPost.id);
    setSavedPostIds((current) =>
      shouldSave ? [selectedPost.id, ...current] : current.filter((id) => id !== selectedPost.id),
    );

    try {
      await toggleArchiveItemSaved(selectedPost.id, shouldSave);
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "Could not update saved posts.");
      setSavedPostIds((current) =>
        shouldSave ? current.filter((id) => id !== selectedPost.id) : [selectedPost.id, ...current],
      );
    }
  }

  function handleSaveSearch() {
    updatePreveState((state) => addSavedSearch(state, searchValue));
  }

  function handleFindSimilar() {
    if (!selectedPost) return;
    setSearchValue(selectedPost.topics.slice(0, 2).join(" "));
    setSelectedPost(null);
    inputRef.current?.focus();
  }

  async function handleToggleCollectionsPanel() {
    const opening = !collectionsOpen;
    setCollectionsOpen(opening);
    if (opening && collectionsList.length === 0) {
      try {
        setCollectionsList(await listCollections());
      } catch (err) {
        setCollectionError(err instanceof Error ? err.message : "Couldn't load collections.");
      }
    }
  }

  async function handleToggleInCollection(collectionId: string) {
    if (!selectedPost || collectionBusy) return;
    setCollectionBusy(collectionId);
    setCollectionError("");
    try {
      const inIt = postCollectionIds.includes(collectionId);
      if (inIt) {
        await removeItemFromCollection(collectionId, selectedPost.id);
        setPostCollectionIds((prev) => prev.filter((id) => id !== collectionId));
      } else {
        await addItemToCollection(collectionId, selectedPost.id);
        setPostCollectionIds((prev) => [...prev, collectionId]);
      }
      setCollectionsList((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, itemCount: Math.max(0, c.itemCount + (inIt ? -1 : 1)) } : c,
        ),
      );
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : "Couldn't update the collection.");
    } finally {
      setCollectionBusy(null);
    }
  }

  async function handleCreateCollectionAndAdd() {
    const name = newCollectionName.trim();
    if (!name || !selectedPost || collectionBusy) return;
    setCollectionBusy("new");
    setCollectionError("");
    try {
      const created = await createCollection(name, "");
      await addItemToCollection(created.id, selectedPost.id);
      setCollectionsList((prev) => [{ ...created, itemCount: 1 }, ...prev]);
      setPostCollectionIds((prev) => [...prev, created.id]);
      setNewCollectionName("");
    } catch (err) {
      setCollectionError(err instanceof Error ? err.message : "Couldn't create the collection.");
    } finally {
      setCollectionBusy(null);
    }
  }

  // Debounce the query so search-as-you-type hits the server at most every 300ms.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(searchValue.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const [serverResults, setServerResults] = useState<Post[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverLoading, setServerLoading] = useState(false);

  // Build the semantic index once when the user first switches to semantic mode.
  useEffect(() => {
    if (searchMode !== "semantic" || embeddedRef.current) return;
    embeddedRef.current = true;
    setIndexing(true);
    buildEmbeddings()
      .catch(() => {})
      .finally(() => setIndexing(false));
  }, [searchMode]);

  // Search over the whole archive: keyword (Postgres) or semantic (embeddings).
  useEffect(() => {
    if (!debouncedQuery) {
      setServerResults([]);
      setServerTotal(0);
      return;
    }
    let active = true;
    setServerLoading(true);

    const request =
      searchMode === "semantic"
        ? semanticSearch(debouncedQuery).then((posts) => ({ posts, total: posts.length }))
        : searchArchive({
            query: debouncedQuery,
            platform: filterPlatform,
            kind: filterKind,
            days: filterDays === "all" ? "all" : Number(filterDays),
          });

    request
      .then((res) => {
        if (!active) return;
        let posts = res.posts;
        // Semantic results aren't pre-filtered, so apply filters client-side.
        if (searchMode === "semantic") {
          if (filterPlatform !== "all") posts = posts.filter((post) => post.platform === filterPlatform);
          if (filterKind !== "all") posts = posts.filter((post) => post.kind === filterKind);
          if (filterDays !== "all") {
            const cutoff = Date.now() - Number(filterDays) * 86_400_000;
            posts = posts.filter((post) => post.publishedAt && new Date(post.publishedAt).getTime() >= cutoff);
          }
        }
        setServerResults(posts);
        setServerTotal(searchMode === "semantic" ? posts.length : res.total);
      })
      .catch(() => {
        if (!active) return;
        setServerResults([]);
        setServerTotal(0);
      })
      .finally(() => {
        if (active) setServerLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, filterPlatform, filterKind, filterDays, searchMode]);

  const searchResults = serverResults;
  const activeFilterCount =
    (filterPlatform !== "all" ? 1 : 0) + (filterKind !== "all" ? 1 : 0) + (filterDays !== "all" ? 1 : 0);
  const resultTopics = Array.from(new Set(searchResults.flatMap((post) => post.topics))).slice(0, 5);
  const resultPlatforms = Array.from(new Set(searchResults.map((post) => post.platform)));
  const totals = getArchiveStats(archivePosts);
  const similarPosts = selectedPost ? getSimilarArchivePosts(archivePosts, selectedPost) : [];
  const selectedPostSaved = selectedPost ? savedPostIds.includes(selectedPost.id) : false;

  // Browse mode: with no query, the page shows the whole archive (newest
  // first, already ordered by the loader), narrowed by the same filters.
  const filteredArchive = archivePosts.filter((post) => {
    if (filterPlatform !== "all" && post.platform !== filterPlatform) return false;
    if (filterKind !== "all" && post.kind !== filterKind) return false;
    if (filterDays !== "all") {
      const cutoff = Date.now() - Number(filterDays) * 86_400_000;
      if (!post.publishedAt || new Date(post.publishedAt).getTime() < cutoff) return false;
    }
    return true;
  });

  function renderPostCard(post: Post) {
    return (
      <motion.div
        key={post.id}
        layoutId={`post-${post.id}`}
        onClick={() => setSelectedPost(post)}
        style={{
          background: "var(--background)",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1rem",
          cursor: "pointer",
        }}
        className="hover-card"
      >
        <div
          style={{
            fontSize: "0.8rem",
            opacity: 0.5,
            marginBottom: "0.5rem",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <span style={{ color: getPlatformColor(post.platform), fontWeight: 600 }}>{post.platform}</span>
          <span>&bull;</span>
          <span>{post.kind}</span>
          <span>&bull;</span>
          <span>{post.date}</span>
        </div>
        <div
          style={{
            fontWeight: 500,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.content}
        </div>
      </motion.div>
    );
  }

  const filterBar = (
    <div className="search-filter-bar">
      <select
        value={filterPlatform}
        onChange={(event) => setFilterPlatform(event.target.value as Platform | "all")}
        className="search-filter-select"
        aria-label="Filter by platform"
      >
        <option value="all">All platforms</option>
        {platformsWithContent.map((platform) => (
          <option key={platform} value={platform}>{platform}</option>
        ))}
      </select>
      <select
        value={filterKind}
        onChange={(event) => setFilterKind(event.target.value as PostKind | "all")}
        className="search-filter-select"
        aria-label="Filter by type"
      >
        <option value="all">All types</option>
        {(["Post", "Comment", "Thread", "Article"] as PostKind[]).map((kind) => (
          <option key={kind} value={kind}>{kind}</option>
        ))}
      </select>
      <select
        value={filterDays}
        onChange={(event) => setFilterDays(event.target.value as "all" | "7" | "30" | "90" | "365")}
        className="search-filter-select"
        aria-label="Filter by date"
      >
        <option value="all">All time</option>
        <option value="7">Past week</option>
        <option value="30">Past month</option>
        <option value="90">Past 3 months</option>
        <option value="365">Past year</option>
      </select>
      {activeFilterCount > 0 && (
        <button
          type="button"
          className="search-filter-clear"
          onClick={() => {
            setFilterPlatform("all");
            setFilterKind("all");
            setFilterDays("all");
          }}
        >
          Clear ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "1.5rem" }}>
        <div className="search-sticky">
          <div className="search-wrapper" style={{ width: "100%", maxWidth: "640px", transition: "all 0.3s ease" }}>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search Everything You've Ever Posted"
              className="search-input-animated"
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setSelectedPost(null);
              }}
              style={{ padding: "1rem 1.5rem", fontSize: "1.1rem" }}
            />
          </div>

          <div className="search-mode-row">
            {(["keyword", "semantic"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSearchMode(mode)}
                className={`search-mode-btn${searchMode === mode ? " active" : ""}`}
              >
                {mode === "semantic" ? "✨ Semantic" : "Keyword"}
              </button>
            ))}
            {searchMode === "semantic" && indexing && (
              <span className="search-mode-hint">Building semantic index…</span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedPost ? (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: "100%", maxWidth: "640px", marginTop: "3rem" }}
            >
              <button
                onClick={() => setSelectedPost(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--foreground)",
                  opacity: 0.5,
                  cursor: "pointer",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                &larr; Back to results
              </button>

              <div
                style={{
                  background: "var(--background)",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "16px",
                  padding: "2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: getPlatformColor(selectedPost.platform), fontWeight: 600 }}>
                      {selectedPost.platform}
                    </span>
                    <span style={{ opacity: 0.3 }}>&bull;</span>
                    <span style={{ opacity: 0.65, fontSize: "0.9rem" }}>{selectedPost.kind}</span>
                    <span style={{ opacity: 0.3 }}>&bull;</span>
                    <span style={{ opacity: 0.5, fontSize: "0.9rem" }}>{selectedPost.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", opacity: 0.6, fontSize: "0.9rem", flexWrap: "wrap" }}>
                    {selectedPost.engagement.upvotes !== undefined && <span>&uarr; {selectedPost.engagement.upvotes}</span>}
                    {selectedPost.engagement.likes !== undefined && <span>Likes {selectedPost.engagement.likes}</span>}
                    {selectedPost.engagement.comments !== undefined && <span>Comments {selectedPost.engagement.comments}</span>}
                    {selectedPost.engagement.reposts !== undefined && <span>Reposts {selectedPost.engagement.reposts}</span>}
                  </div>
                </div>

                <div style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "var(--foreground)" }}>
                  {selectedPost.content}
                </div>

                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1rem",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    opacity: 0.85,
                  }}
                >
                  <div style={{ fontSize: "0.8rem", opacity: 0.5, marginBottom: "0.4rem" }}>AI Summary</div>
                  <div style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{selectedPost.summary}</div>
                </div>

                <div style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {selectedPost.topics.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "99px",
                        fontSize: "0.85rem",
                      }}
                    >
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : searchValue !== "" ? (
            <motion.div
              key="results-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: "100%", maxWidth: "640px", marginTop: "3rem" }}
            >
              {filterBar}

              <h4 style={{ opacity: 0.5, marginBottom: "1rem" }}>
                {serverLoading
                  ? "Searching…"
                  : `${serverTotal.toLocaleString()} result${serverTotal === 1 ? "" : "s"} for "${searchValue}"`}
                {!serverLoading && serverTotal > searchResults.length
                  ? ` · showing ${searchResults.length}`
                  : ""}
              </h4>

              {serverLoading && searchResults.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.5, marginTop: "3rem" }}>
                  Searching your archive…
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.5, marginTop: "3rem" }}>
                  No matching posts found. Import more content or try another term.
                </div>
              ) : (
                searchResults.map((post) => renderPostCard(post))
              )}
            </motion.div>
          ) : archivePosts.length > 0 ? (
            <motion.div
              key="browse-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: "100%", maxWidth: "640px", marginTop: "3rem" }}
            >
              {filterBar}

              <h4 style={{ opacity: 0.5, marginBottom: "1rem" }}>
                {filteredArchive.length.toLocaleString()} of {archivePosts.length.toLocaleString()} post
                {archivePosts.length === 1 ? "" : "s"} in your archive · start typing to search
              </h4>

              {filteredArchive.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.5, marginTop: "3rem" }}>
                  No posts match these filters.
                </div>
              ) : (
                filteredArchive.map((post) => renderPostCard(post))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ width: "100%", maxWidth: "640px", marginTop: "3rem", textAlign: "center" }}
            >
              <div style={{ opacity: 0.55, lineHeight: 1.6 }}>
                {archiveLoading
                  ? "Loading your archive..."
                  : archiveMessage || "Your archive is empty. Import your first posts or comments to make search useful tonight."}
              </div>
              {!archiveLoading && (
                <Link
                  href="/dashboard/imports"
                  style={{
                    display: "inline-block",
                    marginTop: "1.25rem",
                    color: "var(--background)",
                    background: "var(--foreground)",
                    borderRadius: "9999px",
                    padding: "0.8rem 1.25rem",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Import content
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile: tapping a post floats these actions up as a bottom sheet
          instead of burying them below the results. Backdrop dismisses it. */}
      {selectedPost && (
        <div className="sheet-backdrop" onClick={() => setSelectedPost(null)} aria-hidden="true" />
      )}

      <aside className={`dashboard-right-sidebar${selectedPost ? " sheet-open" : ""}`}>
        {selectedPost && (
          <button
            type="button"
            className="sheet-grabber"
            onClick={() => setSelectedPost(null)}
            aria-label="Close actions"
          >
            <span className="sheet-grabber-pill" />
          </button>
        )}
        <AnimatePresence mode="wait">
          {selectedPost ? (
            <motion.div
              key="detail-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <h3 className="suggestions-heading" style={{ margin: 0 }}>AI Actions</h3>
                {aiUsage && (
                  <span
                    className="ai-usage-badge"
                    style={{ color: aiUsage.remaining <= 5 ? "#d97706" : undefined }}
                    title="AI actions reset every 10 minutes"
                  >
                    {aiUsage.remaining}/{aiUsage.limit} left
                  </span>
                )}
              </div>
              <div className="sheet-post-preview">{selectedPost.content}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button onClick={() => runAi("summarize")} disabled={aiLoading} className="action-btn">
                  {aiLoading ? "Working…" : "Summarize"}
                </button>
                <button onClick={() => runAi("rewrite")} disabled={aiLoading} className="action-btn">
                  Rewrite
                </button>
                <button onClick={() => runAi("repurpose", "LinkedIn post")} disabled={aiLoading} className="action-btn">
                  Repurpose → LinkedIn
                </button>
                <button onClick={() => runAi("repurpose", "X thread")} disabled={aiLoading} className="action-btn">
                  Repurpose → Thread
                </button>
                <button
                  onClick={() => selectedPost.url && window.open(selectedPost.url, "_blank", "noopener,noreferrer")}
                  className="action-btn"
                >
                  Open original
                </button>
                <button onClick={handleSavePost} className="action-btn">
                  {selectedPostSaved ? "Saved to Favorites" : "Save to Favorites"}
                </button>
                <button onClick={handleToggleCollectionsPanel} className="action-btn">
                  {postCollectionIds.length > 0
                    ? `In ${postCollectionIds.length} ${postCollectionIds.length === 1 ? "collection" : "collections"}`
                    : "Add to collection"}
                </button>
                <button onClick={handleFindSimilar} className="action-btn">
                  Find similar posts
                </button>
              </div>

              {collectionsOpen && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {collectionsList.length === 0 && (
                    <p style={{ fontSize: "0.82rem", opacity: 0.6, margin: "0 0 0.25rem" }}>
                      Collections are playlists for your posts — name one below to start.
                    </p>
                  )}
                  {collectionsList.map((collection) => {
                    const inIt = postCollectionIds.includes(collection.id);
                    return (
                      <button
                        key={collection.id}
                        onClick={() => handleToggleInCollection(collection.id)}
                        disabled={collectionBusy !== null}
                        className="context-row"
                        style={{ color: "var(--foreground)", justifyContent: "space-between", opacity: collectionBusy === collection.id ? 0.5 : 1 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {collection.name}
                        </span>
                        <span style={{ color: inIt ? "#16a34a" : "var(--foreground)", opacity: inIt ? 1 : 0.35, fontWeight: 700 }}>
                          {inIt ? "✓" : "+"}
                        </span>
                      </button>
                    );
                  })}
                  <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem" }}>
                    <input
                      value={newCollectionName}
                      maxLength={60}
                      onChange={(event) => setNewCollectionName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleCreateCollectionAndAdd();
                      }}
                      placeholder="New collection…"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "1px solid var(--input-border)",
                        borderRadius: "8px",
                        background: "var(--input-bg)",
                        color: "var(--input-text)",
                        font: "inherit",
                        fontSize: "0.85rem",
                        outline: "none",
                        padding: "0.45rem 0.6rem",
                      }}
                    />
                    <button
                      onClick={() => void handleCreateCollectionAndAdd()}
                      disabled={!newCollectionName.trim() || collectionBusy !== null}
                      className="settings-ghost-btn"
                      style={{ opacity: !newCollectionName.trim() ? 0.5 : 1 }}
                    >
                      Create
                    </button>
                  </div>
                  {collectionError && (
                    <p style={{ color: "#F05522", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>{collectionError}</p>
                  )}
                </div>
              )}

              {aiError && (
                <p style={{ marginTop: "1rem", color: "#F05522", fontSize: "0.85rem", lineHeight: 1.4 }}>{aiError}</p>
              )}

              {generatedRewrite && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "12px",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      marginBottom: "0.65rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        opacity: 0.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      AI result
                    </span>
                    <button
                      onClick={() => handleCopy(generatedRewrite)}
                      style={{
                        border: "1px solid var(--input-border)",
                        background: "transparent",
                        color: "var(--foreground)",
                        borderRadius: "8px",
                        padding: "0.35rem 0.85rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.5 }}>
                    {generatedRewrite}
                  </div>
                </div>
              )}

              {similarPosts.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
                    Similar Posts
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {similarPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="context-row"
                        style={{ color: "var(--foreground)" }}
                      >
                        <span style={{ color: getPlatformColor(post.platform), fontWeight: 600 }}>{post.platform}</span>
                        <span style={{ opacity: 0.55 }}>{post.summary}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : searchValue === "" ? (
            <motion.div
              key="suggestions"
              className="suggestions-container"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4 }}
            >
              <div>
                <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
                  Connected Platforms
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {platformsWithContent.length === 0 && (
                    <div style={{ fontSize: "0.88rem", opacity: 0.55, lineHeight: 1.5 }}>
                      Nothing connected yet —{" "}
                      <Link href="/dashboard/imports" style={{ color: "#F05522" }}>
                        import your first archive
                      </Link>
                      .
                    </div>
                  )}
                  {platformsWithContent.map((platform) => {
                    const count = totals.platformCounts[platform];
                    const connected = count > 0;
                    return (
                      <div
                        key={platform}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          opacity: connected ? 0.8 : 0.5,
                          fontSize: "0.9rem",
                          gap: "1rem",
                        }}
                      >
                        <span>
                          <span aria-hidden="true">{connected ? "\u2713" : "\u25CB"}</span> {getPlatformLabel(platform)}
                        </span>
                        {connected ? (
                          <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>{formatNumber(count)} Items</span>
                        ) : (
                          <Link
                            href="/dashboard/imports"
                            style={{ fontSize: "0.8rem", color: "inherit", textDecoration: "none" }}
                          >
                            Import
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: "3rem" }}>
                <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
                  Indexed
                </h3>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{formatNumber(totals.indexed)}</div>
                <div style={{ opacity: 0.55, fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  posts, comments, threads, and articles
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h3 className="suggestions-heading" style={{ marginBottom: "1.5rem" }}>
                Search Insights
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.9rem", opacity: 0.8 }}>
                <div>
                  <div style={{ opacity: 0.5, fontSize: "0.8rem", marginBottom: "0.25rem" }}>Results Found</div>
                  <div style={{ fontWeight: 600, fontSize: "1.2rem" }}>{searchResults.length} Matches</div>
                </div>

                {resultPlatforms.length > 0 && (
                  <div>
                    <div style={{ opacity: 0.5, fontSize: "0.8rem", marginBottom: "0.75rem" }}>Platforms</div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {resultPlatforms.map((platform) => (
                        <span
                          key={platform}
                          style={{
                            color: getPlatformColor(platform),
                            background: "rgba(0,0,0,0.05)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                          }}
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {resultTopics.length > 0 && (
                  <div>
                    <div style={{ opacity: 0.5, fontSize: "0.8rem", marginBottom: "0.75rem" }}>Related Topics</div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {resultTopics.map((topic) => (
                        <span key={topic} style={{ background: "rgba(0,0,0,0.05)", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleSaveSearch} className="action-btn">
                  Save This Search
                </button>

                <div>
                  <div style={{ opacity: 0.5, fontSize: "0.8rem", marginBottom: "0.75rem" }}>Best Match</div>
                  {searchResults[0] ? (
                    <button
                      onClick={() => setSelectedPost(searchResults[0])}
                      className="context-row"
                      style={{ color: "var(--foreground)" }}
                    >
                      <span>{searchResults[0].summary}</span>
                      <span style={{ opacity: 0.45 }}>Engagement score {formatNumber(getEngagementScore(searchResults[0]))}</span>
                    </button>
                  ) : (
                    <div style={{ opacity: 0.5 }}>No match yet</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style jsx>{`
          .action-btn {
            background: var(--background);
            border: 1px solid rgba(0, 0, 0, 0.1);
            padding: 1rem;
            border-radius: 8px;
            text-align: left;
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--foreground);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .action-btn:hover {
            background: rgba(0, 0, 0, 0.05);
            transform: translateY(-1px);
          }
          .context-row {
            background: transparent;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            padding: 0.75rem;
            text-align: left;
          }
        `}</style>
      </aside>
    </div>
  );
}
