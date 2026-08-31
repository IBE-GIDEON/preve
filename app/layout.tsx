import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_URL = "https://preve-lac.vercel.app";
const SITE_DESCRIPTION =
  "preve turns everything you've ever posted into your next post — your best ideas, resurfaced and remixed with AI in your voice. Never start from a blank page again.";
const SOCIAL_DESCRIPTION =
  "Everything you've ever posted, turned into your next post — resurfaced and remixed with AI, in your voice.";

export const metadata: Metadata = {
  // metadataBase makes every relative OG/Twitter image + canonical URL resolve
  // to an absolute https URL, so link previews unfurl on X, Mastodon, Slack, etc.
  metadataBase: new URL(SITE_URL),
  title: "preve — Your next post is already written",
  description: SITE_DESCRIPTION,
  applicationName: "preve",
  keywords: [
    "repurpose content",
    "content repurposing tool",
    "AI writing assistant",
    "resurface old posts",
    "social media archive search",
    "creator tools",
    "content ideas from your archive",
  ],
  authors: [{ name: "preve" }],
  creator: "preve",
  publisher: "preve",
  appleWebApp: { capable: true, title: "preve", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    apple: "/images/preve-search-mark.png",
  },
  openGraph: {
    title: "preve — Your next post is already written",
    description: SOCIAL_DESCRIPTION,
    url: SITE_URL,
    siteName: "preve",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "preve — Your next post is already written",
    description: SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Structured data: tells Google preve is a free web app (can earn a rich result).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "preve",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the tab bar extend into the iPhone home-bar area
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  var isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
