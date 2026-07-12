"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <div className="app-container" style={{ flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background)" }}>
        <Link href="/" className="logo" style={{ marginBottom: 0, textDecoration: "none" }}>
          <img src="/images/preve-search-mark.svg" alt="" className="logo-mark" />
          <span>preve</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="legal-page-main">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--foreground)", opacity: 0.6, fontSize: "0.9rem", textDecoration: "none", marginBottom: "2rem" }}>
            <ArrowLeft size={16} /> Back to home
          </Link>

          <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "3.2rem", fontWeight: 500, lineHeight: 1.15, margin: "0 0 0.5rem", letterSpacing: "-0.02em" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "0.95rem", opacity: 0.5, margin: "0 0 3rem" }}>Last Updated: July 12, 2026</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.65", fontSize: "1.05rem", color: "var(--foreground)", opacity: 0.9 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                1. Our Commitment to Your Words
              </h2>
              <p style={{ margin: 0 }}>
                Preve is built with a simple core philosophy: **your writing is yours**. We believe in personal data sovereignty. We index your social feeds and conversation archives solely to make your own public voice searchable, searchable, and reusable by you. We do not sell your personal data, nor do we train large language models (LLMs) on your indexed writing.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                2. Information We Collect
              </h2>
              <p style={{ margin: 0 }}>
                When you connect third-party platforms (LinkedIn, X, Reddit) or upload custom writing archives, we collect:
              </p>
              <ul style={{ margin: "0 0 0 1.5rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li><strong>Public Post Archive:</strong> The text contents, media URLs, engagement indicators (likes, replies), and timestamps of posts you select to index.</li>
                <li><strong>Authentication Tokens:</strong> OAuth authorization tokens necessary to request feed content on your behalf. These tokens are stored securely.</li>
                <li><strong>Account details:</strong> Email address, name, and profile configuration parameters.</li>
              </ul>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                3. How We Process Data
              </h2>
              <p style={{ margin: 0 }}>
                We process your indexed posts to generate semantic vectors (embeddings) that power the Search-by-Meaning engine. All search operations and vector queries run against personal index indexes partitioned specifically for your user account. We isolate your indices to maintain absolute query privacy.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                4. Data Deletion
              </h2>
              <p style={{ margin: 0 }}>
                You have full control over your archive. At any point, you can disconnect any social source, delete specific indexed folders, or permanently delete your entire Preve account from the Settings panel. Deleting your account will immediately and permanently wipe all indexed items, tokens, and semantic vectors from our databases.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
