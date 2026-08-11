import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "preve - AI Matching for Everything Your Business Needs",
  description:
    "Preve is AI procurement infrastructure: describe what your business needs, and get matched with the best-fit providers — with the reasoning explained.",
  applicationName: "preve",
  appleWebApp: { capable: true, title: "preve", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    apple: "/images/preve-search-mark.png",
  },
  openGraph: {
    title: "preve - AI Matching for Everything Your Business Needs",
    description:
      "Tell Preve what your business needs — insurance, cloud, accounting, legal, recruiting — and it qualifies the need and matches you with the right providers.",
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
