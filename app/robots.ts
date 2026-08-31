import type { MetadataRoute } from "next";

const SITE_URL = "https://preve-lac.vercel.app";

// Served at /robots.txt — lets search engines crawl the public marketing/legal
// pages, keeps them out of the signed-in app, API, and auth flows.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/auth", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
