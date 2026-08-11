"use client";

import { useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CompanyProfile } from "../../../lib/company";
import type { MatchResult } from "../../../lib/match";
import { getInitials } from "../../../lib/user";

const fieldStyle: CSSProperties = {
  width: "100%",
  border: "1px solid var(--input-border)",
  borderRadius: "12px",
  background: "var(--input-bg)",
  color: "var(--input-text)",
  font: "inherit",
  outline: "none",
  padding: "0.85rem 1rem",
  boxSizing: "border-box",
};

const chipStyle: CSSProperties = {
  border: "1px solid var(--input-border)",
  borderRadius: "999px",
  padding: "0.35rem 0.8rem",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  fontSize: "0.8rem",
  cursor: "pointer",
};

// Starting points, not a taxonomy — they exist to show the shape of a good
// need, and the user is expected to edit what lands in the textarea.
const EXAMPLE_NEEDS = [
  "Cyber insurance",
  "Cloud infrastructure",
  "Accounting firm",
  "Technical recruiting",
  "Legal & compliance for a new market",
];

export default function MatchClient({ company }: { company: CompanyProfile }) {
  const [need, setNeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const needRef = useRef<HTMLTextAreaElement>(null);

  const context = [company.industry, company.size, company.headquarters].filter(Boolean).join(" · ");

  function applyExample(example: string) {
    setNeed(example);
    needRef.current?.focus();
  }

  async function handleMatch(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !need.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Only the need travels: the profile is rebuilt server-side from the row
      // this account owns, so the brief can't be spoofed from here.
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "match", companyId: company.id, text: need.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { match?: MatchResult; error?: string };
      if (!res.ok || !data.match) throw new Error(data.error || "Matching failed — try again.");
      setResult(data.match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Matching failed — try again.");
    } finally {
      setLoading(false);
    }
  }

  const providers = (result?.providers ?? []).filter((p) => p && p.name);

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Find providers</h1>
          <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>
            Describe what your business needs. Preve qualifies the need against your company profile and matches you
            with the best-fit providers — with the reasoning spelled out.
          </p>

          {/* The card is read-only on purpose: it shows what the AI is reasoning
              from, so a bad match is traceable to a thin profile. */}
          <section className="settings-section">
            <h2 className="settings-section-title">Matching for</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt=""
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid var(--input-border)",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    border: "1px solid var(--input-border)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(company.name, "")}
                </span>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div className="settings-muted" style={{ fontSize: "0.85rem" }}>
                  {context || "Add your industry, size, and headquarters for sharper matches."}
                </div>
              </div>

              <Link
                href="/dashboard/company"
                className="auth-inline-link"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}
              >
                <Pencil size={14} /> Edit
              </Link>
            </div>
          </section>

          <section className="settings-section">
            <h2 className="settings-section-title">What do you need?</h2>
            <form onSubmit={handleMatch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label htmlFor="match-need" className="settings-label">
                  The need
                </label>
                <textarea
                  id="match-need"
                  ref={needRef}
                  style={{ ...fieldStyle, minHeight: "110px", resize: "vertical" }}
                  value={need}
                  onChange={(e) => setNeed(e.target.value)}
                  placeholder="e.g. Cyber insurance covering our SaaS platform, or an accounting firm that handles multi-currency startups…"
                  required
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
                  {EXAMPLE_NEEDS.map((example) => (
                    <button key={example} type="button" style={chipStyle} onClick={() => applyExample(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="landing-primary-cta"
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  borderRadius: "12px",
                  padding: "0.9rem 1.5rem",
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  font: "inherit",
                  fontWeight: 600,
                }}
              >
                <Sparkles size={16} />
                {loading ? "Qualifying your need…" : "Match me with providers"}
              </button>
            </form>

            {error && <p style={{ marginTop: "1rem", color: "#EF4444", fontSize: "0.9rem" }}>{error}</p>}
          </section>

          {result && (
            <motion.section
              className="settings-section"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: "1.5rem" }}
            >
              <h2 className="settings-section-title">How Preve read your need</h2>
              {result.qualification?.summary && (
                <p style={{ margin: "0 0 0.85rem", lineHeight: 1.6 }}>{result.qualification.summary}</p>
              )}
              {!!result.qualification?.signals?.length && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {result.qualification.signals.map((signal) => (
                    <span
                      key={signal}
                      style={{
                        fontSize: "0.75rem",
                        border: "1px solid var(--input-border)",
                        borderRadius: "999px",
                        padding: "0.3rem 0.75rem",
                        opacity: 0.85,
                      }}
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {providers.length > 0 && (
            <section style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h2 className="settings-section-title" style={{ marginBottom: 0 }}>
                Recommended providers
              </h2>
              {providers.map((provider, index) => {
                const score = Math.max(0, Math.min(99, Math.round(provider.match ?? 0)));
                return (
                  <motion.article
                    key={`${provider.name}-${index}`}
                    className="settings-section"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    style={{ margin: 0 }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                        {index + 1}. {provider.name}
                      </h3>
                      <span style={{ fontWeight: 700, color: "#10B981", whiteSpace: "nowrap" }}>{score}% match</span>
                    </div>
                    <div
                      aria-hidden="true"
                      style={{
                        height: "6px",
                        borderRadius: "999px",
                        background: "var(--input-border)",
                        margin: "0.6rem 0 0.85rem",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: `${score}%`, height: "100%", background: "#10B981" }} />
                    </div>
                    {provider.why && <p style={{ margin: "0 0 0.5rem", lineHeight: 1.55 }}>{provider.why}</p>}
                    {provider.considerations && (
                      <p className="settings-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                        Worth checking: {provider.considerations}
                      </p>
                    )}
                  </motion.article>
                );
              })}
              <p className="settings-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                Recommendations are AI-qualified starting points, not endorsements — verify pricing and coverage
                directly with each provider.
              </p>
            </section>
          )}
        </motion.div>
      </main>
    </div>
  );
}
