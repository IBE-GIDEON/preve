import {
  siBluesky,
  siDevdotto,
  siFacebook,
  siGithub,
  siInstagram,
  siMastodon,
  siMedium,
  siLemmy,
  siPinterest,
  siReddit,
  siRss,
  siSubstack,
  siYcombinator,
  siThreads,
  siTiktok,
  siTumblr,
  siX,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

export interface BrandIcon {
  /** SVG path data for a 24×24 viewBox. */
  path: string;
  /** Brand hex color, without the leading `#`. */
  hex: string;
}

export interface ConnectPlatform {
  id: string;
  label: string;
  icon: BrandIcon;
  handlePrefix: string;
  /** Whether real OAuth is wired yet. */
  ready: boolean;
  /** If set, "Connect" starts this OAuth flow instead of a simulated connect. */
  oauthStart?: string;
}

const fromSi = (icon: SimpleIcon): BrandIcon => ({ path: icon.path, hex: icon.hex });

// LinkedIn was removed from simple-icons (trademark request), so ship its
// official logo path directly.
const LINKEDIN: BrandIcon = {
  hex: "0A66C2",
  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

/** Every platform a user can connect. Reddit is live; the rest await OAuth. */
export const CONNECT_PLATFORMS: ConnectPlatform[] = [
  { id: "reddit", label: "Reddit", icon: fromSi(siReddit), handlePrefix: "u/", ready: true, oauthStart: "/api/connect/reddit" },
  { id: "x", label: "X", icon: fromSi(siX), handlePrefix: "@", ready: false },
  { id: "linkedin", label: "LinkedIn", icon: LINKEDIN, handlePrefix: "", ready: false },
  { id: "youtube", label: "YouTube", icon: fromSi(siYoutube), handlePrefix: "@", ready: false },
  { id: "instagram", label: "Instagram", icon: fromSi(siInstagram), handlePrefix: "@", ready: false },
  { id: "threads", label: "Threads", icon: fromSi(siThreads), handlePrefix: "@", ready: false },
  { id: "tiktok", label: "TikTok", icon: fromSi(siTiktok), handlePrefix: "@", ready: false },
  { id: "facebook", label: "Facebook", icon: fromSi(siFacebook), handlePrefix: "", ready: false },
  { id: "mastodon", label: "Mastodon", icon: fromSi(siMastodon), handlePrefix: "@", ready: true, oauthStart: "/dashboard/imports" },
  { id: "bluesky", label: "Bluesky", icon: fromSi(siBluesky), handlePrefix: "@", ready: true, oauthStart: "/dashboard/imports" },
  { id: "rss", label: "RSS / Blog", icon: fromSi(siRss), handlePrefix: "", ready: true, oauthStart: "/dashboard/imports" },
  { id: "hackernews", label: "Hacker News", icon: fromSi(siYcombinator), handlePrefix: "", ready: true, oauthStart: "/dashboard/imports" },
  { id: "devto", label: "Dev.to", icon: fromSi(siDevdotto), handlePrefix: "@", ready: true, oauthStart: "/dashboard/imports" },
  { id: "lemmy", label: "Lemmy", icon: fromSi(siLemmy), handlePrefix: "@", ready: true, oauthStart: "/dashboard/imports" },
  { id: "github", label: "GitHub", icon: fromSi(siGithub), handlePrefix: "", ready: false },
  { id: "medium", label: "Medium", icon: fromSi(siMedium), handlePrefix: "@", ready: false },
  { id: "substack", label: "Substack", icon: fromSi(siSubstack), handlePrefix: "", ready: false },
  { id: "tumblr", label: "Tumblr", icon: fromSi(siTumblr), handlePrefix: "", ready: false },
  { id: "pinterest", label: "Pinterest", icon: fromSi(siPinterest), handlePrefix: "", ready: false },
];

export function getConnectPlatform(id: string): ConnectPlatform | undefined {
  return CONNECT_PLATFORMS.find((platform) => platform.id === id);
}
