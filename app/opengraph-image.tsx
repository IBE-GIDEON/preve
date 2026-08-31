import { ImageResponse } from "next/og";

// Dynamic 1200×630 social card — this is what unfurls when a preve link is
// pasted on X, Mastodon, LinkedIn, Slack, iMessage, Product Hunt, etc.
export const alt = "preve — Your next post is already written";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1c0f08 60%, #2a1408 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 46,
            fontWeight: 800,
            color: "#F05522",
            letterSpacing: -1,
          }}
        >
          preve
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: -3,
              maxWidth: 980,
            }}
          >
            Your next post is already written.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.35,
              marginTop: 28,
              maxWidth: 900,
            }}
          >
            Everything you&apos;ve ever posted, resurfaced and remixed with AI — in your voice.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          preve-lac.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
