"use client";

import React from "react";
import { Carousel, Card } from "./ui/apple-cards-carousel";

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="highlight-text">
    {children}
  </span>
);

const AIContent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
    <p style={{ margin: 0 }}>
      Your public writing is full of valuable concepts. Preve uses semantic indexes to analyze your post history, synthesize repeating themes, and generate outlines.
    </p>
    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.25rem" }}>
      <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
        Semantic Extraction
      </span>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.5 }}>
        Instead of sorting through keywords, Preve identifies the underlying meaning. When you search for <Highlight>"pricing advice"</Highlight>, it connects your past remarks about solo founder margins, value metrics, and tier setups across all platforms.
      </p>
    </div>
  </div>
);

const ProductivityContent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
    <p style={{ margin: 0 }}>
      Stop scrolling through bookmarks, custom platform searches, or old text files. Preve provides a single calm query interface.
    </p>
    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.25rem" }}>
      <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
        Contextual Memory
      </span>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.5 }}>
        Retrieve your ideas instantly. Preve indexes the entire discussion thread, including replies, keeping the original context intact. You get a clear picture of why that particular thought resonated with your audience.
      </p>
    </div>
  </div>
);

const RemixContent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
    <p style={{ margin: 0 }}>
      Turn old publications into fresh work. Repurpose successful social posts, replies, and comments into new templates, newsletters, or articles.
    </p>
    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.25rem" }}>
      <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
        Content Refinement
      </span>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.5 }}>
        Select multiple snippets from your index, compile them, and send them to the draft builder. You can easily expand, summarize, or rewrite them for different platforms, ensuring your voice remains consistent.
      </p>
    </div>
  </div>
);

const TrustContent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
    <p style={{ margin: 0 }}>
      Your data belongs to you. Preve maintains strict scoping rules when connecting your credentials and indexes only the platforms you explicitly permit.
    </p>
    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.25rem" }}>
      <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--foreground)", display: "block", marginBottom: "0.5rem" }}>
        Platform Scoping
      </span>
      <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.5 }}>
        We only index public-facing content. Direct messages, settings, and personal account details are never retrieved or stored. Control what is synced and delete your index at any time with a single click.
      </p>
    </div>
  </div>
);

const data = [
  {
    category: "Artificial Intelligence",
    title: "You can do more with semantic search.",
    src: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1000&auto=format&fit=crop",
    content: <AIContent />,
  },
  {
    category: "Productivity",
    title: "Enhance your creator workflow.",
    src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1000&auto=format&fit=crop",
    content: <ProductivityContent />,
  },
  {
    category: "Content Remix",
    title: "Compile, expand, and publish.",
    src: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1000&auto=format&fit=crop",
    content: <RemixContent />,
  },
  {
    category: "Privacy & Control",
    title: "Launch-grade trust from day one.",
    src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1000&auto=format&fit=crop",
    content: <TrustContent />,
  },
];

export function WhyItMattersCarousel() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div style={{ width: "100%", padding: "2rem 0" }}>
      <Carousel items={cards} />
    </div>
  );
}
