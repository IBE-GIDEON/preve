import type { MetadataRoute } from "next";

// PWA manifest: creators are phone-first — "Add to Home Screen" makes preve
// feel like an app (standalone window, brand color, real icon).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "preve — your creator memory",
    short_name: "preve",
    description: "Search everything you've ever posted. Import your archive, find it instantly, repurpose it with AI.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#F05522",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/images/preve-search-mark.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
