"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { motion } from "framer-motion";
import type { Platform, Post, PostKind } from "../../data/mockPosts";
import { getPlatformColor } from "../../data/mockPosts";
import { PLATFORM_ORDER } from "../../lib/preveState";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { getArchiveStats, importManualArchive, loadArchivePostsCached } from "../../../lib/archive/client";
import { getConnectPlatform } from "../../../lib/connect-platforms";
import { clearImportJobs, getRecentImportJobs, type ImportJob } from "../../../lib/imports/client";
import { isValidBlueskyHandle, normalizeBlueskyHandle } from "../../../lib/bluesky-shared";
import { isRedditEnabled } from "../../../lib/flags";
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
  const [clearingImports, setClearingImports] = useState(false);
  const [redditUsername, setRedditUsername] = useState("");
  const [redditImporting, setRedditImporting] = useState(false);
  const [redditMessage, setRedditMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [exportImporting, setExportImporting] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyImporting, setBlueskyImporting] = useState(false);
  const [blueskyMessage, setBlueskyMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [mastodonHandle, setMastodonHandle] = useState("");
  const [mastodonImporting, setMastodonImporting] = useState(false);
  const [mastodonMessage, setMastodonMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rssUrl, setRssUrl] = useState("");
  const [rssImporting, setRssImporting] = useState(false);
  const [rssMessage, setRssMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [hnUsername, setHnUsername] = useState("");
  const [hnImporting, setHnImporting] = useState(false);
  const [hnMessage, setHnMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [devtoUsername, setDevtoUsername] = useState("");
  const [devtoImporting, setDevtoImporting] = useState(false);
  const [devtoMessage, setDevtoMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [lemmyHandle, setLemmyHandle] = useState("");
  const [lemmyImporting, setLemmyImporting] = useState(false);
  const [lemmyMessage, setLemmyMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const exportInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totals = useMemo(() => getArchiveStats(archivePosts), [archivePosts]);
  const importCount = countImportItems(rawText);
  const connectedPlatforms = PLATFORM_ORDER.filter((item) => totals.platformCounts[item] > 0).length;
  const redditIcon = getPlatformIcon("Reddit");
  const blueskyIcon = getPlatformIcon("Bluesky");
  const mastodonIcon = getPlatformIcon("Mastodon");
  const rssIcon = getPlatformIcon("RSS");
  const hnIcon = getPlatformIcon("HackerNews");
  const devtoIcon = getPlatformIcon("Devto");
  const lemmyIcon = getPlatformIcon("Lemmy");
  const platformsWithContent = PLATFORM_ORDER.filter((item) => totals.platformCounts[item] > 0);

  useEffect(() => {
    void refreshArchive();
  }, []);

  async function refreshArchive() {
    try {
      setLoading(true);
      // Cached snapshot paints instantly; fresh data replaces it in place.
      await loadArchivePostsCached((result) => {
        setArchivePosts(result.posts);
        setLoading(false);
      });
      getRecentImportJobs().then(setImportJobs).catch(() => {});
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load your archive.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearImports() {
    if (clearingImports) return;
    setClearingImports(true);
    try {
      await clearImportJobs();
      setImportJobs([]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Couldn't clear the import log.");
    } finally {
      setClearingImports(false);
    }
  }

  // Hand browser-fetched items to the server in chunks (the ingest route
  // re-validates everything and caps each request).
  async function ingestInChunks(username: string, items: NormalizedItem[]): Promise<number> {
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
    return imported;
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
      let imported: number;
      try {
        // First choice: fetch Reddit from THIS browser (a real browser on a
        // home connection is the path Reddit is least likely to bot-wall),
        // then hand the items to the server, which re-validates them.
        const items = await fetchRedditPublicArchiveInBrowser(username);
        imported = await ingestInChunks(username, items);
      } catch (browserError) {
        // Bad username → no point retrying anywhere.
        if (isFatalRedditError(browserError)) throw browserError;
        // Browser path blocked (CORS/network) → let the server fetch instead.
        const res = await fetch("/api/import/reddit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
        if (!res.ok) throw new Error(data.error || "Import failed.");
        imported = data.imported ?? 0;
      }
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
        : " Use Connect Reddit above instead — it doesn't get blocked.";
      setRedditMessage({ ok: false, text: message + tip });
    } finally {
      setRedditImporting(false);
    }
  }

  async function handleBlueskyImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const handle = normalizeBlueskyHandle(blueskyHandle);
    if (!isValidBlueskyHandle(handle)) {
      setBlueskyMessage({ ok: false, text: "Enter a valid Bluesky handle (like you.bsky.social)." });
      return;
    }
    setBlueskyImporting(true);
    setBlueskyMessage(null);

    try {
      const res = await fetch("/api/import/bluesky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const imported = data.imported ?? 0;
      setBlueskyMessage({
        ok: true,
        text:
          imported === 0
            ? "That profile has no posts to import yet."
            : `Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"}. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      setBlueskyMessage({ ok: false, text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setBlueskyImporting(false);
    }
  }

  async function handleMastodonImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mastodonHandle.trim()) return;
    setMastodonImporting(true);
    setMastodonMessage(null);

    try {
      const res = await fetch("/api/import/mastodon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: mastodonHandle }),
      });
      const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const imported = data.imported ?? 0;
      setMastodonMessage({
        ok: true,
        text:
          imported === 0
            ? "That account has no posts to import yet."
            : `Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"}. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      setMastodonMessage({ ok: false, text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setMastodonImporting(false);
    }
  }

  async function handleRssImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rssUrl.trim()) return;
    setRssImporting(true);
    setRssMessage(null);

    try {
      const res = await fetch("/api/import/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rssUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string; title?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const imported = data.imported ?? 0;
      const from = data.title ? ` from ${data.title}` : "";
      setRssMessage({
        ok: true,
        text:
          imported === 0
            ? "No posts found in that feed."
            : `Imported ${formatNumber(imported)} ${imported === 1 ? "post" : "posts"}${from}. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      setRssMessage({ ok: false, text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setRssImporting(false);
    }
  }

  // Shared handler for the keyless username/handle imports (HN, Dev.to, Lemmy).
  async function runKeylessImport(
    endpoint: string,
    payload: Record<string, string>,
    setImporting: (value: boolean) => void,
    setMessage: (value: { ok: boolean; text: string } | null) => void,
    emptyNoun: string,
  ) {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Import failed.");
      const imported = data.imported ?? 0;
      setMessage({
        ok: true,
        text:
          imported === 0
            ? `No ${emptyNoun} to import yet.`
            : `Imported ${formatNumber(imported)} ${imported === 1 ? "item" : "items"}. Head to Search and try it.`,
      });
      await refreshArchive();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      setImporting(false);
    }
  }

  function handleHnImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hnUsername.trim()) return;
    void runKeylessImport("/api/import/hackernews", { username: hnUsername }, setHnImporting, setHnMessage, "posts");
  }

  function handleDevtoImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!devtoUsername.trim()) return;
    void runKeylessImport("/api/import/devto", { username: devtoUsername }, setDevtoImporting, setDevtoMessage, "articles");
  }

  function handleLemmyImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lemmyHandle.trim()) return;
    void runKeylessImport("/api/import/lemmy", { handle: lemmyHandle }, setLemmyImporting, setLemmyMessage, "posts");
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

      const imported = await ingestInChunks(username, items);

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

          {isRedditEnabled() && (
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
              The reliable way: sign in with Reddit once and your history imports automatically.
            </div>

            <button
              type="button"
              onClick={() => window.location.assign("/api/connect/reddit")}
              style={{
                background: "#FF4500",
                border: "none",
                borderRadius: "9999px",
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                padding: "0.8rem 1.5rem",
                width: "100%",
                fontSize: "0.95rem",
              }}
            >
              Connect Reddit — one-click import
            </button>

            <div style={{ opacity: 0.5, fontSize: "0.82rem", margin: "1rem 0 0.6rem" }}>
              Or try by username (public posts only — Reddit sometimes blocks this):
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
          )}

          <form
            onSubmit={handleBlueskyImport}
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
                  background: "#0085FF",
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
                {blueskyIcon && <PlatformIcon icon={blueskyIcon} color="#ffffff" size={17} title="Bluesky" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Bluesky</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your handle — Bluesky&rsquo;s API is open. No login, no keys, no blocks.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={blueskyHandle}
                onChange={(event) => setBlueskyHandle(event.target.value)}
                placeholder="you.bsky.social"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={blueskyImporting || blueskyHandle.trim().length === 0}
                style={{
                  background: "#0085FF",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: blueskyImporting || blueskyHandle.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: blueskyImporting || blueskyHandle.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {blueskyImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {blueskyMessage && (
              <div
                style={{
                  color: blueskyMessage.ok ? "#16a34a" : "#F05522",
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                }}
              >
                {blueskyMessage.text}
              </div>
            )}
          </form>

          <form
            onSubmit={handleMastodonImport}
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
                  background: "#6364FF",
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
                {mastodonIcon && <PlatformIcon icon={mastodonIcon} color="#ffffff" size={17} title="Mastodon" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Mastodon</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your full handle — Mastodon&rsquo;s API is open. No login, no keys, no blocks.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={mastodonHandle}
                onChange={(event) => setMastodonHandle(event.target.value)}
                placeholder="@you@mastodon.social"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={mastodonImporting || mastodonHandle.trim().length === 0}
                style={{
                  background: "#6364FF",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: mastodonImporting || mastodonHandle.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: mastodonImporting || mastodonHandle.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {mastodonImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {mastodonMessage && (
              <div
                style={{
                  color: mastodonMessage.ok ? "#16a34a" : "#F05522",
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                }}
              >
                {mastodonMessage.text}
              </div>
            )}
          </form>

          <form
            onSubmit={handleRssImport}
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
                  background: "#F26522",
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
                {rssIcon && <PlatformIcon icon={rssIcon} color="#ffffff" size={16} title="RSS" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import a blog or newsletter</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Paste your Substack, Medium, or blog URL — we pull every post via its open RSS feed.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={rssUrl}
                onChange={(event) => setRssUrl(event.target.value)}
                placeholder="yourname.substack.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={rssImporting || rssUrl.trim().length === 0}
                style={{
                  background: "#F26522",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: rssImporting || rssUrl.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: rssImporting || rssUrl.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {rssImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {rssMessage && (
              <div
                style={{
                  color: rssMessage.ok ? "#16a34a" : "#F05522",
                  marginTop: "0.75rem",
                  fontSize: "0.9rem",
                }}
              >
                {rssMessage.text}
              </div>
            )}
          </form>

          <form
            onSubmit={handleHnImport}
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
                  background: "#F0652F",
                  color: "white",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {hnIcon && <PlatformIcon icon={hnIcon} color="#ffffff" size={17} title="Hacker News" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Hacker News</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your HN username — stories and comments, via the open API. No keys.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={hnUsername}
                onChange={(event) => setHnUsername(event.target.value)}
                placeholder="pg"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={hnImporting || hnUsername.trim().length === 0}
                style={{
                  background: "#F0652F",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: hnImporting || hnUsername.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: hnImporting || hnUsername.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {hnImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {hnMessage && (
              <div style={{ color: hnMessage.ok ? "#16a34a" : "#F05522", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                {hnMessage.text}
              </div>
            )}
          </form>

          <form
            onSubmit={handleDevtoImport}
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
                  background: "#0A0A0A",
                  color: "white",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {devtoIcon && <PlatformIcon icon={devtoIcon} color="#ffffff" size={17} title="Dev.to" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Dev.to</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your Dev.to username — every article via the open API. No keys.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={devtoUsername}
                onChange={(event) => setDevtoUsername(event.target.value)}
                placeholder="ben"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={devtoImporting || devtoUsername.trim().length === 0}
                style={{
                  background: "#0A0A0A",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: devtoImporting || devtoUsername.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: devtoImporting || devtoUsername.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {devtoImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {devtoMessage && (
              <div style={{ color: devtoMessage.ok ? "#16a34a" : "#F05522", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                {devtoMessage.text}
              </div>
            )}
          </form>

          <form
            onSubmit={handleLemmyImport}
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
                  background: "#14854F",
                  color: "white",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {lemmyIcon && <PlatformIcon icon={lemmyIcon} color="#ffffff" size={17} title="Lemmy" />}
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Import from Lemmy</h2>
            </div>
            <div style={{ opacity: 0.55, fontSize: "0.9rem", marginBottom: "1rem" }}>
              Type your full handle — Lemmy&rsquo;s API is open and federated. No keys.
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                value={lemmyHandle}
                onChange={(event) => setLemmyHandle(event.target.value)}
                placeholder="@you@lemmy.world"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...fieldStyle, flex: 1 }}
              />
              <button
                type="submit"
                disabled={lemmyImporting || lemmyHandle.trim().length === 0}
                style={{
                  background: "#14854F",
                  border: "none",
                  borderRadius: "9999px",
                  color: "white",
                  cursor: lemmyImporting || lemmyHandle.trim().length === 0 ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: lemmyImporting || lemmyHandle.trim().length === 0 ? 0.5 : 1,
                  padding: "0.7rem 1.4rem",
                }}
              >
                {lemmyImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {lemmyMessage && (
              <div style={{ color: lemmyMessage.ok ? "#16a34a" : "#F05522", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                {lemmyMessage.text}
              </div>
            )}
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
            {!loading && platformsWithContent.length === 0 && (
              <div style={{ padding: "1.75rem", textAlign: "center" }}>
                <p style={{ fontWeight: 600 }}>Nothing imported yet</p>
                <p className="settings-muted" style={{ marginTop: "0.3rem" }}>
                  Your platforms appear here once content lands — start with Reddit or Bluesky above.
                </p>
              </div>
            )}
            {platformsWithContent.map((item, index) => {
              const count = totals.platformCounts[item];
              const isConnected = count > 0;
              const platformIcon = getPlatformIcon(item);

              return (
                <div
                  key={item}
                  style={{
                    padding: "2rem",
                    borderBottom: index === platformsWithContent.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 className="suggestions-heading" style={{ margin: 0 }}>Recent imports</h3>
                <button
                  type="button"
                  onClick={handleClearImports}
                  disabled={clearingImports}
                  title="Clears this history log only — your imported posts stay in your archive."
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--foreground)",
                    opacity: clearingImports ? 0.4 : 0.6,
                    cursor: clearingImports ? "default" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  {clearingImports ? "Clearing…" : "Clear"}
                </button>
              </div>
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
