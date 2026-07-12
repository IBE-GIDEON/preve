"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getEngagementScore,
  getPlatformColor,
  type Platform,
  type Post,
  searchPosts,
} from "../data/mockPosts";
import {
  addSavedSearch,
  DEFAULT_PREVE_STATE,
  getInitialPreveState,
  PLATFORM_ORDER,
  savePreveState,
  saveSearchQuery,
  type PreveState,
} from "../lib/preveState";
import {
  getArchiveStats,
  getSimilarArchivePosts,
  loadArchivePosts,
  toggleArchiveItemSaved,
} from "../../lib/archive/client";

const SUGGESTIONS = [
  "React performance",
  "Stripe integration",
  "Startup ideas",
  "Docker comments",
  "AI posts",
];

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getPlatformLabel(platform: Platform) {
  return platform === "X" ? "X" : platform;
}

function createLinkedInRewrite(post: Post) {
  return [
    "A lesson worth repeating:",
    "",
    post.summary,
    "",
    post.content,
    "",
    `Originally from ${post.platform}. Topics: ${post.topics.join(", ")}.`,
  ].join("\n");
}

export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedRewrite, setGeneratedRewrite] = useState("");
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [preveState, setPreveState] = useState<PreveState>(DEFAULT_PREVE_STATE);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreveState(getInitialPreveState());
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setSearchValue(query);

    loadArchive();
  }, []);

  useEffect(() => {
    if (searchValue !== "") return;
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [searchValue]);

  useEffect(() => {
    if (searchValue === "") setSelectedPost(null);
  }, [searchValue]);

  useEffect(() => {
    setCopied(false);
    setGeneratedRewrite("");
  }, [selectedPost?.id]);

  useEffect(() => {
    const cleanQuery = searchValue.trim();
    if (cleanQuery.length < 2) return;

    const timeout = window.setTimeout(() => {
      updatePreveState((state) => saveSearchQuery(state, cleanQuery));
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  async function loadArchive() {
    try {
      setArchiveLoading(true);
      setArchiveMessage("");
      const result = await loadArchivePosts();
      setArchivePosts(result.posts);
      setSavedPostIds(result.savedPostIds);
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

  function handleSuggestionClick(suggestion: string) {
    setSearchValue(suggestion);
    setSelectedPost(null);
    inputRef.current?.focus();
    updatePreveState((state) => saveSearchQuery(state, suggestion));
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

  const visibleSuggestions = [];
  for (let i = 0; i < 3; i += 1) {
    visibleSuggestions.push(SUGGESTIONS[(currentIndex + i) % SUGGESTIONS.length]);
  }

  const searchResults = useMemo(() => searchPosts(searchValue, archivePosts), [searchValue, archivePosts]);
  const resultTopics = Array.from(new Set(searchResults.flatMap((post) => post.topics))).slice(0, 5);
  const resultPlatforms = Array.from(new Set(searchResults.map((post) => post.platform)));
  const totals = getArchiveStats(archivePosts);
  const similarPosts = selectedPost ? getSimilarArchivePosts(archivePosts, selectedPost) : [];
  const selectedPostSaved = selectedPost ? savedPostIds.includes(selectedPost.id) : false;

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "1.5rem" }}>
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
              <h4 style={{ opacity: 0.5, marginBottom: "1rem" }}>
                {searchResults.length} results for "{searchValue}"
              </h4>

              {searchResults.length === 0 ? (
                <div style={{ textAlign: "center", opacity: 0.5, marginTop: "3rem" }}>
                  No matching posts found. Import more content or try another term.
                </div>
              ) : (
                searchResults.map((post) => (
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
                ))
              )}
            </motion.div>
          ) : archiveLoading || archivePosts.length === 0 || archiveMessage ? (
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
          ) : null}
        </AnimatePresence>
      </main>

      <aside className="dashboard-right-sidebar">
        <AnimatePresence mode="wait">
          {selectedPost ? (
            <motion.div
              key="detail-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <h3 className="suggestions-heading" style={{ marginBottom: "1.5rem" }}>
                AI Actions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button onClick={() => handleCopy(generatedRewrite || selectedPost.content)} className="action-btn">
                  {copied ? "Copied" : generatedRewrite ? "Copy Rewrite" : "Copy Content"}
                </button>
                <button onClick={() => setGeneratedRewrite(createLinkedInRewrite(selectedPost))} className="action-btn">
                  Rewrite for LinkedIn
                </button>
                <button
                  onClick={() => selectedPost.url && window.open(selectedPost.url, "_blank", "noopener,noreferrer")}
                  className="action-btn"
                >
                  Open Original
                </button>
                <button onClick={handleSavePost} className="action-btn">
                  {selectedPostSaved ? "Saved to Favorites" : "Save to Favorites"}
                </button>
                <button onClick={handleFindSimilar} className="action-btn">
                  Find Similar Posts
                </button>
              </div>

              {generatedRewrite && (
                <div
                  style={{
                    marginTop: "1.5rem",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "12px",
                    padding: "1rem",
                    whiteSpace: "pre-wrap",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  {generatedRewrite}
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
              <h3 className="suggestions-heading">Try asking</h3>
              <div className="chat-bubble-container">
                <AnimatePresence mode="popLayout">
                  {visibleSuggestions.map((suggestion) => (
                    <motion.div
                      layout
                      key={suggestion}
                      className="chat-suggestion-row"
                      onClick={() => handleSuggestionClick(suggestion)}
                      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -20, filter: "blur(4px)", transition: { duration: 0.3 } }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {suggestion}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div style={{ marginTop: "3rem" }}>
                <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
                  Connected Platforms
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {PLATFORM_ORDER.map((platform) => {
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
