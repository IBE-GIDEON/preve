"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WandSparkles, X } from "lucide-react";
import Link from "next/link";
import type { Platform, Post } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { PLATFORM_ORDER } from "../../lib/preveState";
import { loadArchivePostsCached } from "../../../lib/archive/client";
import { SHARE_TARGETS } from "../../../lib/publish";
import { loadStoredPosts, saveStoredPosts, type StoredSuggestion } from "../../../lib/preve-posts";

interface SourceRef {
  id: string;
  text: string;
  platform: Platform;
  date: string;
}

interface UsageInfo {
  remaining: number;
  limit: number;
}

// The native format the AI repurposes a draft into, per platform.
const REPURPOSE_FORMAT: Record<Platform, string> = {
  X: "X thread",
  LinkedIn: "LinkedIn post",
  Bluesky: "Bluesky post",
  Mastodon: "Mastodon post",
  Reddit: "Reddit post",
  RSS: "blog post",
  HackerNews: "Hacker News post",
  Devto: "Dev.to article",
  Lemmy: "Lemmy post",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--input-border)",
  borderRadius: "12px",
  background: "var(--input-bg)",
  color: "var(--input-text)",
  font: "inherit",
  outline: "none",
  padding: "0.85rem 1rem",
};

// Pick a diverse, high-signal slice of the archive: the AI learns voice from
// the best-performing posts plus the most recent, deduped and capped.
function pickSources(posts: Post[]): SourceRef[] {
  const usable = posts.filter((p) => p.content && p.content.trim().length > 40);
  const score = (p: Post) => (Number(p.engagement?.likes) || 0) + (Number(p.engagement?.comments) || 0);
  const topEngaged = [...usable].sort((a, b) => score(b) - score(a)).slice(0, 6);
  const recent = usable.slice(0, 6); // loadArchivePosts returns newest-first

  const seen = new Set<string>();
  const merged: Post[] = [];
  for (const p of [...topEngaged, ...recent]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged.slice(0, 10).map((p) => ({
    id: p.id,
    text: p.content.slice(0, 600),
    platform: p.platform,
    date: p.date,
  }));
}

function getPlatformLabel(platform: Platform) {
  return platform === "X" ? "X" : platform;
}

export default function PrevePostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(true);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [suggestions, setSuggestions] = useState<StoredSuggestion[]>([]);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [cardBusy, setCardBusy] = useState<number | null>(null);
  const [repurposeOpen, setRepurposeOpen] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const autoTried = useRef(false);

  // Platforms you can repurpose *into*: X + LinkedIn always, plus what you've
  // actually imported (so the AI can retarget a draft to another network).
  const repurposeTargets = useMemo<Platform[]>(() => {
    const withContent = PLATFORM_ORDER.filter((platform) => posts.some((post) => post.platform === platform));
    const merged: Platform[] = ["X", "LinkedIn", ...withContent];
    return merged.filter((platform, i) => merged.indexOf(platform) === i);
  }, [posts]);

  function persist(nextSuggestions: StoredSuggestion[], nextDrafts: string[], nextSources: SourceRef[]) {
    saveStoredPosts({
      sources: nextSources.map((s) => ({ id: s.id, text: s.text, platform: s.platform, date: s.date })),
      suggestions: nextSuggestions,
      drafts: nextDrafts,
    });
  }

  useEffect(() => {
    const stored = loadStoredPosts();
    if (stored) {
      setSources(stored.sources.map((s) => ({ ...s, platform: s.platform as Platform })));
      setSuggestions(stored.suggestions);
      setDrafts(stored.drafts);
    }

    loadArchivePostsCached((result) => {
      setPosts(result.posts);
      setLoadingArchive(false);
      // First visit with an archive but nothing saved → seed a few waiting ideas.
      if (!stored && !autoTried.current && result.posts.length > 0) {
        autoTried.current = true;
        void generate(3, result.posts);
      }
    }).catch(() => setLoadingArchive(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(count: number, postsOverride?: Post[]) {
    if (generating) return;
    const pool = postsOverride ?? posts;
    if (pool.length === 0) {
      setMessage({ ok: false, text: "Import some posts first — preve writes your next post from your history." });
      return;
    }
    setGenerating(true);
    setMessage(null);

    const srcs = pickSources(pool);
    setSources(srcs);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          count,
          sources: srcs.map((s) => ({ text: s.text, platform: s.platform })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        suggestions?: StoredSuggestion[];
        error?: string;
        usage?: UsageInfo;
      };
      if (data.usage) setUsage(data.usage);
      if (!res.ok) throw new Error(data.error || "Couldn't generate ideas.");

      const next = data.suggestions ?? [];
      const nextDrafts = next.map((s) => s.post);
      setSuggestions(next);
      setDrafts(nextDrafts);
      persist(next, nextDrafts, srcs);
      if (next.length === 0) setMessage({ ok: false, text: "No ideas came back — try again." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Couldn't generate ideas." });
    } finally {
      setGenerating(false);
    }
  }

  async function runCardAi(index: number, action: "rewrite" | "repurpose", format?: string) {
    if (cardBusy !== null) return;
    const text = drafts[index];
    if (!text?.trim()) return;
    setCardBusy(index);
    setMessage(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text, format }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string; error?: string; usage?: UsageInfo };
      if (data.usage) setUsage(data.usage);
      if (!res.ok) throw new Error(data.error || "AI request failed.");
      const next = [...drafts];
      next[index] = data.result || next[index];
      setDrafts(next);
      persist(suggestions, next, sources);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "AI request failed." });
    } finally {
      setCardBusy(null);
    }
  }

  function updateDraft(index: number, value: string) {
    const next = [...drafts];
    next[index] = value;
    setDrafts(next);
    persist(suggestions, next, sources);
  }

  function deleteCard(index: number) {
    const nextSuggestions = suggestions.filter((_, i) => i !== index);
    const nextDrafts = drafts.filter((_, i) => i !== index);
    setSuggestions(nextSuggestions);
    setDrafts(nextDrafts);
    if (repurposeOpen === index) setRepurposeOpen(null);
    persist(nextSuggestions, nextDrafts, sources);
  }

  async function copyDraft(index: number) {
    const text = drafts[index];
    if (!text?.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 2000);
    } catch {
      // clipboard blocked — ignore
    }
  }

  function publish(index: number, url: string) {
    if (!drafts[index]?.trim()) return;
    void copyDraft(index);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const hasIdeas = suggestions.length > 0;

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "720px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <WandSparkles size={25} color="#F05522" aria-hidden="true" /> preve Posts
          </h1>
          <p className="settings-muted" style={{ marginBottom: "1.5rem" }}>
            Your next post, already written — drawn from your own history, in your voice. Tweak it, repurpose it, post it.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
            <button
              className="settings-save-btn"
              style={{ height: "46px", padding: "0 1.4rem" }}
              onClick={() => generate(hasIdeas ? 4 : 3)}
              disabled={generating || loadingArchive}
            >
              {generating ? "Reading your history…" : hasIdeas ? "✨ Fresh ideas" : "✨ Generate post ideas"}
            </button>
            {usage && (
              <span className="settings-muted" style={{ fontSize: "0.8rem" }}>
                {usage.remaining}/{usage.limit} AI generations left
              </span>
            )}
          </div>

          <p className="settings-muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
            {loadingArchive
              ? "Loading your archive…"
              : posts.length > 0
                ? `Grounded in your ${posts.length} imported ${posts.length === 1 ? "post" : "posts"}.`
                : "No posts yet — import your archive and preve will write from it."}
          </p>

          {posts.length === 0 && !loadingArchive && (
            <div
              style={{
                marginTop: "1.25rem",
                border: "1px dashed var(--input-border)",
                borderRadius: "14px",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <p style={{ marginBottom: "0.85rem", opacity: 0.75 }}>
                preve Posts needs your history to riff on. Import a platform first — it takes a minute.
              </p>
              <Link href="/dashboard/imports" className="settings-save-btn" style={{ display: "inline-flex", height: "42px", alignItems: "center", padding: "0 1.2rem", textDecoration: "none" }}>
                Import your posts
              </Link>
            </div>
          )}

          {generating && !hasIdeas && (
            <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton-card" style={{ height: "180px" }} />
              ))}
            </div>
          )}

          {message && (
            <p className={message.ok ? "settings-status ok" : "auth-field-error"} style={{ marginTop: "1rem" }}>
              {message.text}
            </p>
          )}

          {/* Idea cards */}
          <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <AnimatePresence initial={false}>
              {suggestions.map((suggestion, index) => {
                const ref = sources[suggestion.source - 1];
                const draft = drafts[index] ?? "";
                const busy = cardBusy === index;
                return (
                  <motion.article
                    key={`${suggestion.post.slice(0, 24)}-${index}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "16px",
                      padding: "1.25rem",
                      background: "var(--background)",
                      position: "relative",
                    }}
                  >
                    {/* Delete */}
                    <button
                      onClick={() => deleteCard(index)}
                      aria-label="Dismiss this idea"
                      title="Dismiss this idea"
                      style={{
                        position: "absolute",
                        top: "0.75rem",
                        right: "0.75rem",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0.4,
                        display: "flex",
                        padding: "0.2rem",
                        borderRadius: "6px",
                        color: "var(--foreground)",
                      }}
                    >
                      <X size={17} aria-hidden="true" />
                    </button>

                    {ref && (
                      <div
                        style={{
                          borderLeft: `3px solid ${getPlatformColor(ref.platform)}`,
                          paddingLeft: "0.75rem",
                          marginBottom: "1rem",
                          marginRight: "1.5rem",
                        }}
                      >
                        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.55, marginBottom: "0.25rem" }}>
                          Based on your {ref.platform} post · {ref.date}
                        </div>
                        <div style={{ fontSize: "0.85rem", opacity: 0.7, lineHeight: 1.5 }}>
                          {ref.text.length > 220 ? `${ref.text.slice(0, 220)}…` : ref.text}
                        </div>
                      </div>
                    )}

                    {suggestion.platform && (
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#F05522", marginBottom: "0.5rem" }}>
                        Suggested for {suggestion.platform}
                      </div>
                    )}

                    <textarea
                      value={draft}
                      onChange={(event) => updateDraft(index, event.target.value)}
                      rows={Math.min(10, Math.max(4, Math.ceil((draft.length || 1) / 60)))}
                      style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.55, opacity: busy ? 0.6 : 1 }}
                      disabled={busy}
                    />
                    <div style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.3rem" }}>
                      {busy ? "Working…" : `${draft.length} chars`}
                    </div>

                    {/* AI actions */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "center" }}>
                      <button className="settings-ghost-btn" onClick={() => runCardAi(index, "rewrite")} disabled={!draft.trim() || cardBusy !== null}>
                        Improve
                      </button>

                      <div style={{ position: "relative" }}>
                        <button
                          className="settings-ghost-btn"
                          onClick={() => setRepurposeOpen((current) => (current === index ? null : index))}
                          disabled={!draft.trim() || cardBusy !== null}
                        >
                          Repurpose {repurposeOpen === index ? "▴" : "▾"}
                        </button>
                        {repurposeOpen === index && (
                          <div className="repurpose-menu" style={{ position: "absolute", zIndex: 5, marginTop: "0.3rem", minWidth: "160px" }}>
                            {repurposeTargets.map((platform) => (
                              <button
                                key={platform}
                                className="repurpose-menu-item"
                                onClick={() => {
                                  setRepurposeOpen(null);
                                  void runCardAi(index, "repurpose", REPURPOSE_FORMAT[platform]);
                                }}
                              >
                                {getPlatformLabel(platform)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button className="settings-ghost-btn" onClick={() => copyDraft(index)} disabled={!draft.trim()}>
                        {copiedIndex === index ? "Copied ✓" : "Copy"}
                      </button>
                    </div>

                    {/* Post to */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", opacity: 0.5, marginRight: "0.15rem" }}>Post to:</span>
                      {SHARE_TARGETS.map((target) => (
                        <button
                          key={target.id}
                          onClick={() => publish(index, target.url(draft))}
                          disabled={!draft.trim()}
                          title={target.prefills ? `Open ${target.label} with your post ready` : `Copy & open ${target.label}`}
                          style={{
                            background: target.color,
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "9999px",
                            padding: "0.45rem 0.9rem",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            cursor: draft.trim() ? "pointer" : "not-allowed",
                            opacity: draft.trim() ? 1 : 0.45,
                          }}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>

          {hasIdeas && (
            <p className="settings-muted" style={{ fontSize: "0.8rem", marginTop: "1.5rem" }}>
              Prefer a blank page? <Link href="/dashboard/compose" style={{ color: "#F05522" }}>Write from scratch →</Link>
              {"  "}⏱ Scheduled auto-posting is coming next.
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
