"use client";

import type { CSSProperties } from "react";

export interface CompanyPreviewCardProps {
  name: string;
  slug: string;
  tagline: string;
  industry: string;
  size: string;
  logoUrl: string;
}

/**
 * Up to two letters drawn from the name, so a page has an identity before a
 * logo exists. Digits count too — "3M" should read as "3M", not "M".
 */
function monogram(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word.match(/[a-z0-9]/i)?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return letters.toUpperCase();
}

const placeholder: CSSProperties = { opacity: 0.35 };

export default function CompanyPreviewCard({ name, slug, tagline, industry, size, logoUrl }: CompanyPreviewCardProps) {
  const initials = monogram(name);
  // Industry and size arrive one at a time, so the separator has to be earned.
  const meta = [industry, size].filter(Boolean).join(" · ");

  return (
    <aside
      aria-label="Page preview"
      style={{
        flex: "1 1 280px",
        minWidth: "min(100%, 260px)",
        maxWidth: "380px",
        // Follows the form down the page on wide screens; harmless once wrapped.
        position: "sticky",
        top: "1.5rem",
        alignSelf: "flex-start",
      }}
    >
      <p className="settings-section-title" style={{ marginBottom: "0.75rem" }}>
        Page preview
      </p>

      <div className="settings-section" style={{ marginBottom: 0 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "14px",
              objectFit: "cover",
              border: "1px solid var(--input-border)",
              background: "var(--background)",
              display: "block",
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "14px",
              border: initials ? "1px solid var(--input-border)" : "1px dashed var(--input-border)",
              background: "var(--background)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              opacity: initials ? 0.85 : 0.3,
            }}
          >
            {initials || "?"}
          </div>
        )}

        <h3
          style={{
            margin: "0.9rem 0 0",
            fontSize: "1.25rem",
            fontWeight: 700,
            lineHeight: 1.25,
            wordBreak: "break-word",
            ...(name.trim() ? undefined : placeholder),
          }}
        >
          {name.trim() || "Your company name"}
        </h3>

        <p
          style={{
            margin: "0.4rem 0 0",
            fontSize: "0.92rem",
            lineHeight: 1.5,
            wordBreak: "break-word",
            ...(tagline.trim() ? { opacity: 0.75 } : placeholder),
          }}
        >
          {tagline.trim() || "Your tagline appears here"}
        </p>

        <p
          className="settings-muted"
          style={{ margin: "0.7rem 0 0", fontSize: "0.85rem", ...(meta ? undefined : placeholder) }}
        >
          {meta || "Industry · Company size"}
        </p>

        <p
          style={{
            margin: "1rem 0 0",
            paddingTop: "0.9rem",
            borderTop: "1px solid var(--input-border)",
            fontSize: "0.8rem",
            opacity: 0.55,
            wordBreak: "break-all",
          }}
        >
          preve.app/company/{slug.trim() || "your-company"}
        </p>
      </div>
    </aside>
  );
}
