"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { Platform, Post, PostKind } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { PLATFORM_ORDER } from "../../lib/preveState";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { getArchiveStats, importManualArchive, loadArchivePosts } from "../../../lib/archive/client";
import { getConnectPlatform } from "../../../lib/connect-platforms";
import { getRecentImportJobs, type ImportJob } from "../../../lib/imports/client";
import { fetchRedditPublicArchiveInBrowser, isFatalRedditError } from "../../../lib/reddit-browser";
import { parseRedditExportCsv } from "../../../lib/reddit-export";
import {
  isValidRedditUsername,
  normalizeRedditUsername,
  type NormalizedItem,
} from "../../../lib/reddit-shared";

const KIND_OPTIONS: PostKind[] = ["Post", "Comment", "Thread", "Article"];

const numberFormatter = new Intl.NumberFormat("en-US");

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

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function getPlatformName(platform: Platform) {
  return platform === "X" ? "X (Twitter)" : platform;
}

function getPlatformIcon(platform: Platform) {
  const platformId = platform === "X" ? "x" : platform.toLowerCase();
  return getConnectPlatform(platformId)?.icon;
}

function countImportItems(rawText: string) {
  return rawText
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function jobStatusLabel(status: ImportJob["status"]) {
  return { queued: "Queued", running: "Importing", completed: "Completed", failed: "Failed" }[status];
}

function jobStatusColor(status: ImportJob["status"]) {
  return { queued: "var(--foreground)", running: "#d97706", completed: "#16a34a", failed: "#ef4444" }[status];
}

function importAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ImportsPage() {
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [platform, setPlatform] = useState<Platform>("Reddit");
  const [kind, setKind] = useState<PostKind>("Post");
  const [sourceTitle, setSourceTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [redditUsername, setRedditUsername] = useState("");
  const [redditImporting, setRedditImporting] = useState(false);
  const [redditMessage, setRedditMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [exportImporting, setExportImporting] = useState(false);
  const exportInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totals = useMemo(() => getArchiveStats(archivePosts), [archivePosts]);
  const importCount = countImportItems(rawText);
  const connectedPlatforms = PLATFORM_ORDER.filter((item) => totals.platformCounts[item] > 0).length;
  const redditIcon = getPlatformIcon("Reddit");

  useEffect(() => {
    void refreshArchive();
  }, []);

  async function refreshArchive() {
    try {
      setLoading(true);
      const result = await loadArchivePosts();
      setArchivePosts(result.posts);
      getRecentImportJobs().then(setImportJobs).catch(() => {});
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load your archive.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRedditImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = normalizeRedditUsername(redditUsername);
    if (!isValidRedditUsername(username)) {
      setRedditMessage({ ok: false, text: "Enter a valid Reddit username (like u/yourname)." });
      return;
    }
    setRedditImporting(true);
    setRedditMessage(null);

    try {
      let res: Response;
      try {
        // First choice: fetch Reddit from THIS browser (a real browser on a
        // home connection is the path Reddit is least likely to bot-wall),
        // then hand the items to the server, which re-validates them.
        const items = await fetchRedditPublicArchiveInBrowser(username, 3);
        res = await fetch("/api/import/reddit/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, items }),
        });
      } catch (browserError) {
        // Bad username → no point retrying anywhere.
        if (isFatalRedditError(browserError)) throw browserError;
        // Browser path blocked (CORS/network) → let the server fetch instead.
        res = await fetch("/api/import/reddit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
      }

      const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const imported = data.imported ?? 0;
      setRedditMessage({
        ok: true,
        text:
          imported === 0
            ? "That profile has nothing public to import."
            : `Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"}. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      const tip = message.includes("doesn't exist")
        ? ""
        : " Tip: upload your Reddit export below — that always works.";
      setRedditMessage({ ok: false, text: message + tip });
    } finally {
      setRedditImporting(false);
    }
  }

  // Guaranteed path: the user uploads posts.csv / comments.csv from Reddit's
  // official data export — no API involved, so nothing can block it.
  async function handleRedditExportUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const username = normalizeRedditUsername(redditUsername);
    if (!isValidRedditUsername(username)) {
      setRedditMessage({ ok: false, text: "Type your Reddit username above first, then upload your export." });
      if (exportInputRef.current) exportInputRef.current.value = "";
      return;
    }
    setExportImporting(true);
    setRedditMessage(null);

    try {
      const items: NormalizedItem[] = [];
      for (const file of Array.from(files)) {
        items.push(...parseRedditExportCsv(await file.text()));
      }
      if (items.length === 0) {
        throw new Error("No posts or comments found. Upload posts.csv or comments.csv from your Reddit export.");
      }

      let imported = 0;
      for (let i = 0; i < items.length; i += 500) {
        const res = await fetch("/api/import/reddit/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, items: items.slice(i, i + 500) }),
        });
        const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
        if (!res.ok) throw new Error(data.error || "Import failed.");
        imported += data.imported ?? 0;
      }

      setRedditMessage({
        ok: true,
        text: `Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"} from your export. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      setRedditMessage({ ok: false, text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setExportImporting(false);
      if (exportInputRef.current) exportInputRef.current.value = "";
    }
  }

  async function handleManualImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setStatusMessage("");

    try {
      const imported = await importManualArchive({
        platform,
        kind,
        sourceTitle,
        rawText,
      });
      setRawText("");
      setStatusMessage(`Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"} into your archive.`);
      await refreshArchive();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  function focusPlatformImport(nextPlatform: Platform) {
    setPlatform(nextPlatform);
    textareaRef.current?.focus();
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "4rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Imports</h1>

          <form
            onSubmit={handleRedditImport}
            style={{
              background: "var(--background)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "16px",
              marginBottom: "1rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
              <div
                style={{
                  background: "#FF4500",
                  color: "white",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {redditIcon && <PlatformIcon icon={redditIcon} color="#ffffff" size={17} title="Reddit" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Reddit</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your username — we pull your public posts and comments. No Reddit login needed.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={redditUsername}
                onChange={(event) => setRedditUsername(event.target.value)}
                placeholder="u/yourname"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={redditImporting || redditUsername.trim().length === 0}
                style={{
                  background: "#FF4500",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: redditImporting || redditUsername.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: redditImporting || redditUsername.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {redditImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {redditMessage && (
              <div
                style={{
                  color: redditMessage.ok ? "#16a34a" : "#F05522",
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                }}
              >
                {redditMessage.text}
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: "1.25rem", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.9rem", opacity: 0.75, marginBottom: "0.6rem", lineHeight: 1.5 }}>
                <strong>Or upload your Reddit export</strong> (works even when Reddit blocks imports):
                request it at{" "}
                <a
                  href="https://www.reddit.com/settings/data-request"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#FF4500", textDecoration: "underline" }}
                >
                  reddit.com/settings/data-request
                </a>
                , unzip the file Reddit emails you, then drop <code>posts.csv</code> and <code>comments.csv</code> here.
              </div>
              <input
                ref={exportInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                disabled={exportImporting}
                onChange={(event) => void handleRedditExportUpload(event.target.files)}
                style={{ fontSize: "0.85rem", opacity: exportImporting ? 0.5 : 0.9, maxWidth: "100%" }}
              />
              {exportImporting && (
                <div style={{ fontSize: "0.85rem", opacity: 0.6, marginTop: "0.5rem" }}>Reading your export…</div>
              )}
            </div>
          </form>

          <form
            onSubmit={handleManualImport}
            style={{
              background: "var(--background)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "16px",
              marginBottom: "1rem",
              padding: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.35rem" }}>Manual Import</h2>
                <div style={{ opacity: 0.55, fontSize: "0.9rem" }}>
                  {importCount > 0 ? `${formatNumber(importCount)} ready to import` : "Paste content to index"}
                </div>
              </div>
              <button
                type="submit"
                disabled={importing || importCount === 0}
                style={{
                  background: "var(--foreground)",
                  border: "none",
                  borderRadius: "9999px",
                  color: "var(--background)",
                  cursor: importing || importCount === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  height: "fit-content",
                  opacity: importing || importCount === 0 ? 0.5 : 1,
                  padding: "0.7rem 1rem",
                }}
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", opacity: 0.75 }}>
                Platform
                <select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)} style={fieldStyle}>
                  {PLATFORM_ORDER.map((item) => (
                    <option key={item} value={item}>
                      {getPlatformName(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", opacity: 0.75 }}>
                Type
                <select value={kind} onChange={(event) => setKind(event.target.value as PostKind)} style={fieldStyle}>
                  {KIND_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <input
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="Source title"
              style={{ ...fieldStyle, marginTop: "0.75rem" }}
            />
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Paste posts or comments here. Separate each item with a blank line."
              rows={8}
              style={{ ...fieldStyle, marginTop: "0.75rem", resize: "vertical", lineHeight: 1.5 }}
            />

            {statusMessage && (
              <div style={{ color: statusMessage.startsWith("Imported") ? "#16a34a" : "#F05522", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                {statusMessage}
              </div>
            )}
          </form>

          <div
            style={{
              background: "var(--background)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            {PLATFORM_ORDER.map((item, index) => {
              const count = totals.platformCounts[item];
              const isConnected = count > 0;
              const platformIcon = getPlatformIcon(item);

              return (
                <div
                  key={item}
                  style={{
                    padding: "2rem",
                    borderBottom: index === PLATFORM_ORDER.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: isConnected ? "1.5rem" : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div
                        style={{
                          background: getPlatformColor(item),
                          color: "white",
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "1.2rem",
                        }}
                      >
                        {platformIcon && <PlatformIcon icon={platformIcon} color="#ffffff" size={20} title={getPlatformName(item)} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{getPlatformName(item)}</div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                          {loading ? "Checking archive" : isConnected ? "Ready for search" : "No items imported"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => focusPlatformImport(item)}
                      style={{
                        background: "rgba(0,0,0,0.05)",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        fontWeight: 500,
                        cursor: "pointer",
                        color: "var(--foreground)",
                      }}
                    >
                      {isConnected ? "Add more" : "Import"}
                    </button>
                  </div>

                  {isConnected && (
                    <div style={{ display: "flex", gap: "3rem", opacity: 0.8 }}>
                      <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{formatNumber(count)}</div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Items</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>Active</div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>Status</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      <aside className="dashboard-right-sidebar">
        <div>
          <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
            Import Status
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
            <div>
              <div style={{ opacity: 0.5, fontSize: "0.8rem" }}>Indexed</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{formatNumber(totals.indexed)}</div>
            </div>
            <div>
              <div style={{ opacity: 0.5, fontSize: "0.8rem" }}>Sources</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{connectedPlatforms}</div>
            </div>
            <div style={{ opacity: 0.65, lineHeight: 1.5 }}>
              Imports are stored in your private Supabase archive and become searchable from the dashboard.
            </div>
          </div>

          {importJobs.length > 0 && (
            <div style={{ marginTop: "2rem" }}>
              <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>Recent imports</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {importJobs.map((job) => (
                  <div key={job.id} style={{ fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{job.platform}</span>
                      <span style={{ color: jobStatusColor(job.status), fontWeight: 600 }}>
                        {jobStatusLabel(job.status)}
                      </span>
                    </div>
                    <div style={{ opacity: 0.55, marginTop: "0.15rem" }}>
                      {job.status === "failed"
                        ? job.error ?? "Import failed"
                        : `${formatNumber(job.importedItems)} items`}
                      {job.completedAt
                        ? ` · ${importAgo(job.completedAt)}`
                        : job.startedAt
                          ? ` · ${importAgo(job.startedAt)}`
                          : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
