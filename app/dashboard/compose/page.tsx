"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { loadArchivePostsCached } from "../../../lib/archive/client";
import { SHARE_TARGETS } from "../../../lib/publish";

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

export default function ComposePage() {
  const [brief, setBrief] = useState("");
  const [content, setContent] = useState("");
  const [samples, setSamples] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get("text");
    if (seed) setContent(seed);
    // Pull a few recent posts as voice samples for the AI.
    loadArchivePostsCached((result) => {
      setSamples(
        result.posts
          .map((p) => p.content)
          .filter((c) => c && c.trim().length > 20)
          .slice(0, 5),
      );
    }).catch(() => {});
  }, []);

  async function callAi(action: "compose" | "rewrite", payloadText: string) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text: payloadText, samples }),
    });
    const data = (await res.json().catch(() => ({}))) as { result?: string; error?: string };
    if (!res.ok) throw new Error(data.error || "AI request failed.");
    return data.result || "";
  }

  async function handleGenerate() {
    if (!brief.trim() || generating) return;
    setGenerating(true);
    setMessage(null);
    try {
      setContent(await callAi("compose", brief.trim()));
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Couldn't generate." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleImprove() {
    if (!content.trim() || improving) return;
    setImproving(true);
    setMessage(null);
    try {
      setContent(await callAi("rewrite", content.trim()));
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Couldn't improve." });
    } finally {
      setImproving(false);
    }
  }

  async function copyContent() {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — ignore
    }
  }

  function publishTo(url: string) {
    if (!content.trim()) return;
    void copyContent();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const busy = generating || improving;

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Compose</h1>
          <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>
            Write in your voice, then post it anywhere.
          </p>

          {/* Brief -> AI in your voice */}
          <section className="settings-section">
            <h2 className="settings-section-title">Write with AI</h2>
            <label htmlFor="brief" className="settings-label">
              What do you want to post about?
            </label>
            <input
              id="brief"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="e.g. a lesson I learned shipping my first app"
              style={fieldStyle}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleGenerate();
              }}
            />
            <button
              className="settings-save-btn"
              style={{ marginTop: "0.85rem", height: "42px" }}
              onClick={handleGenerate}
              disabled={!brief.trim() || busy}
            >
              {generating ? "Writing…" : "✨ Write in my voice"}
            </button>
            <p className="settings-muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
              {samples.length > 0
                ? `Matched to the voice of ${samples.length} of your imported posts.`
                : "Import some posts first and the AI will match your voice."}
            </p>
          </section>

          {/* Editor */}
          <section className="settings-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <h2 className="settings-section-title" style={{ marginBottom: 0 }}>
                Your post
              </h2>
              <span className="settings-muted" style={{ fontSize: "0.78rem" }}>
                {content.length} chars
              </span>
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your post here, or generate one above…"
              rows={9}
              style={{ ...fieldStyle, marginTop: "0.75rem", resize: "vertical", lineHeight: 1.55 }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <button className="settings-ghost-btn" onClick={handleImprove} disabled={!content.trim() || busy}>
                {improving ? "Improving…" : "Improve with AI"}
              </button>
              <button className="settings-ghost-btn" onClick={copyContent} disabled={!content.trim()}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </section>

          {/* Publish */}
          <section className="settings-section">
            <h2 className="settings-section-title">Post it</h2>
            <p className="settings-muted" style={{ marginTop: "-0.35rem", marginBottom: "0.9rem", fontSize: "0.85rem" }}>
              Opens each platform&rsquo;s composer with your text ready — you tap post. Your text is copied too.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  onClick={() => publishTo(target.url(content))}
                  disabled={!content.trim()}
                  style={{
                    background: target.color,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "0.6rem 1.1rem",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: content.trim() ? "pointer" : "not-allowed",
                    opacity: content.trim() ? 1 : 0.5,
                  }}
                  title={target.prefills ? `Open ${target.label} with your post ready` : `Copy & open ${target.label}`}
                >
                  {target.label}
                </button>
              ))}
            </div>
            <p className="settings-muted" style={{ fontSize: "0.78rem", marginTop: "0.9rem" }}>
              ⏱ Scheduled auto-posting (Bluesky &amp; Mastodon) is coming next.
            </p>
          </section>

          {message && (
            <p className={message.ok ? "settings-status ok" : "auth-field-error"} style={{ marginTop: "0.25rem" }}>
              {message.text}
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
