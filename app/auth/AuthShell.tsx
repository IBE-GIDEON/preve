"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import ThemeToggle from "../../components/ThemeToggle";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared chrome for every auth screen: header, centered card, title/subtitle. */
export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="app-container" style={{ flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="logo" style={{ marginBottom: 0, textDecoration: "none" }}>
          <img src="/images/preve-search-mark.png" alt="" className="logo-mark" />
          <span>preve</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 2rem 4rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: "400px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1
              style={{
                fontSize: "2.4rem",
                fontFamily: "'Newsreader', Georgia, serif",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                marginBottom: "0.75rem",
              }}
            >
              {title}
            </h1>
            <p style={{ opacity: 0.6, fontSize: "0.95rem", lineHeight: 1.5 }}>{subtitle}</p>
          </div>

          <div
            style={{
              border: "1px solid var(--input-border)",
              borderRadius: "16px",
              background: "var(--input-bg)",
              padding: "1.5rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.015)",
            }}
          >
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
