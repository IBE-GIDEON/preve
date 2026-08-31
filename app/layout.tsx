import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "preve — Your next post is already written",
  description:
    "preve turns everything you've ever posted into your next post — your best ideas, resurfaced and remixed with AI in your voice. Never start from a blank page again.",
  applicationName: "preve",
  appleWebApp: { capable: true, title: "preve", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    apple: "/images/preve-search-mark.png",
  },
  openGraph: {
    title: "preve — Your next post is already written",
    description:
      "Everything you've ever posted, turned into your next post — resurfaced and remixed with AI, in your voice.",
    type: "website",
  },
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
