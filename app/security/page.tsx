"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { motion } from "framer-motion";

export default function SecurityPage() {
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
            Security Policy
          </h1>
          <p style={{ fontSize: "0.95rem", opacity: 0.5, margin: "0 0 3rem" }}>Last Updated: July 12, 2026</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.65", fontSize: "1.05rem", color: "var(--foreground)", opacity: 0.9 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                1. Data Encryption
              </h2>
              <p style={{ margin: 0 }}>
                All user data, including login credentials, social tokens, semantic vectors, and indexed post contents, are encrypted both in transit (using TLS 1.3) and at rest (using AES-256 encryption standards). This ensures that your social archive remains securely shielded.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                2. Token and Credential Security
              </h2>
              <p style={{ margin: 0 }}>
                We use secure OAuth 2.0 flows to connect to external accounts (LinkedIn, X, Reddit). We request the minimum scopes required to fetch post history. Your authentication tokens are stored securely in Supabase Auth sessions using Row Level Security policies, which prevent unauthorized read access.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                3. Third-party Processing & LLMs
              </h2>
              <p style={{ margin: 0 }}>
                Preve is built with search and retrieval privacy as a priority:
              </p>
              <ul style={{ margin: "0 0 0 1.5rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Your posts are never shared with advertising networks or third-party data broker services.</li>
                <li>Embeddings are created using dedicated secure API endpoints, and we enforce a strict policy of zero-data-retention for model training.</li>
              </ul>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                4. Vulnerability Disclosure
              </h2>
              <p style={{ margin: 0 }}>
                We welcome reports of security vulnerabilities. If you discover a security issue on Preve, please contact us at <code style={{ fontSize: "0.95rem", background: "var(--input-bg)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--input-border)" }}>security@preve.com</code>. We pledge to review and remediate all verified security issues within 72 hours.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
