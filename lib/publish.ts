// Publish hand-off: open each platform's own composer with the text
// pre-filled. No credentials, no write-API approval, no ban risk — the user
// hits "post" in the platform's real UI. (True keyless API auto-posting for
// Bluesky/Mastodon is a separate, scheduled build.)

export interface ShareTarget {
  id: string;
  label: string;
  color: string;
  /** Compose URL with the text pre-filled, or the site to paste into. */
  url: (text: string) => string;
  /** True when the URL actually pre-fills the text (vs. just opening the site). */
  prefills: boolean;
}

export const SHARE_TARGETS: ShareTarget[] = [
  { id: "x", label: "X", color: "#000000", prefills: true, url: (t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}` },
  { id: "bluesky", label: "Bluesky", color: "#0085FF", prefills: true, url: (t) => `https://bsky.app/intent/compose?text=${encodeURIComponent(t)}` },
  { id: "threads", label: "Threads", color: "#000000", prefills: true, url: (t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}` },
  { id: "mastodon", label: "Mastodon", color: "#6364FF", prefills: false, url: () => "https://mastodon.social/home" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", prefills: false, url: () => "https://www.linkedin.com/feed/" },
];
