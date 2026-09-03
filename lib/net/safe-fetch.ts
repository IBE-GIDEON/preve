// SSRF guard for server-side fetches of user-supplied URLs/hosts (RSS feeds,
// Mastodon/Lemmy instances). Blocks non-http(s) schemes and private/loopback/
// link-local hosts, re-checks every redirect hop, and caps response size + time.
//
// Note: this blocks literal private IPs and obvious internal hostnames. It does
// not resolve DNS, so a public hostname that resolves to a private IP could slip
// through (DNS rebinding). Good enough as a first line; a resolver-based check
// is the follow-up if this ever needs hardening.

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true; // this-host, loopback, private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  // IPv6 loopback / unspecified / link-local (fe80::) / unique-local (fc/fd)
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

/** Parse + validate a URL for server-side fetching. Throws if unsafe. */
export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("That address isn't allowed.");
  }
  return url;
}

interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Fetch text from a user-supplied URL with SSRF protection: validates the host,
 * follows up to 4 redirects re-checking each hop, times out, and caps bytes.
 */
export async function safeFetchText(raw: string, options: SafeFetchOptions = {}): Promise<string> {
  const maxBytes = options.maxBytes ?? 5_000_000;
  const timeoutMs = options.timeoutMs ?? 10_000;
  let target = assertSafeHttpUrl(raw).toString();

  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: options.headers,
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`Fetch failed (${res.status}).`);
        target = assertSafeHttpUrl(new URL(location, target).toString()).toString();
        continue;
      }
      if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);

      const reader = res.body?.getReader();
      if (!reader) return (await res.text()).slice(0, maxBytes);

      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.length;
        if (total > maxBytes) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
      const merged = new Uint8Array(total > maxBytes ? maxBytes : total);
      let offset = 0;
      for (const chunk of chunks) {
        if (offset + chunk.length > merged.length) {
          merged.set(chunk.subarray(0, merged.length - offset), offset);
          break;
        }
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return new TextDecoder("utf-8").decode(merged);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}
