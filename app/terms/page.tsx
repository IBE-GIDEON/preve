"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="app-container" style={{ flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background)" }}>
        <Link href="/" className="logo" style={{ marginBottom: 0, textDecoration: "none" }}>
          <img src="/images/preve-search-mark.png" alt="" className="logo-mark" />
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
            Terms of Service
          </h1>
          <p style={{ fontSize: "0.95rem", opacity: 0.5, margin: "0 0 3rem" }}>Last Updated: July 12, 2026</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: "1.65", fontSize: "1.05rem", color: "var(--foreground)", opacity: 0.9 }}>
            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                1. Acceptance of Terms
              </h2>
              <p style={{ margin: 0 }}>
                By creating a Preve account or connecting writing archives, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not access or use the platform.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                2. User Archives and Content Rights
              </h2>
              <p style={{ margin: 0 }}>
                Preve does not claim ownership over any posts, links, writing samples, or conversations you index. You retain full intellectual property rights to your content. You represent that you have all necessary permissions to authorize Preve to fetch, index, and organize the writing history of your connected profiles.
              </p>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                3. Prohibited Conduct
              </h2>
              <p style={{ margin: 0 }}>
                You agree not to use Preve to:
              </p>
              <ul style={{ margin: "0 0 0 1.5rem", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>Index archives containing malware, viruses, or code designed to interfere with platform operations.</li>
                <li>Infringe upon the intellectual property or privacy rights of any third parties.</li>
                <li>Attempt to scrape, reverse engineer, or disrupt the database architecture of Preve.</li>
              </ul>
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.85rem", fontWeight: 500, margin: "0", color: "var(--foreground)" }}>
                4. Disclaimer of Warranties
              </h2>
              <p style={{ margin: 0 }}>
                Preve is provided on an "as is" and "as available" basis. While we strive to maintain high indexing speed and query availability, we make no warranties regarding data persistence or continuous uptime. We encourage backing up your original social media data locally.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
