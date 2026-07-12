const DEFAULT_AUTH_REDIRECT = "/dashboard";
const LOCAL_URL_BASE = "https://preve.local";

export function getSafeRedirectPath(value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT) {
  if (!value) return fallback;

  let candidate = value.trim();
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, LOCAL_URL_BASE);
    if (url.origin !== LOCAL_URL_BASE) return fallback;
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
