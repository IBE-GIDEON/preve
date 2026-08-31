import type { MetadataRoute } from "next";

const SITE_URL = "https://preve-lac.vercel.app";

// Served at /sitemap.xml — the list of public pages we want indexed. Submit this
// URL once in Google Search Console after launch.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/support", priority: 0.6, changeFrequency: "monthly" },
    { path: "/security", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
