import { NextResponse } from "next/server";

export const maxDuration = 15;

// Answers one question: can THIS deployment's egress reach Reddit's public
// JSON? Fixed target, no params (so it can't be used as a proxy), cached to
// avoid hammering Reddit.
const HOSTS = ["https://www.reddit.com", "https://old.reddit.com", "https://api.reddit.com"];

let cached: { at: number; body: { ok: boolean; host: string | null } } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < 5 * 60_000) {
    return NextResponse.json(cached.body);
  }

  let ok = false;
  let host: string | null = null;
  for (const h of HOSTS) {
    try {
      const path = h === "https://api.reddit.com" ? "/user/spez/about" : "/user/spez/about.json";
      const res = await fetch(`${h}${path}?raw_json=1`, {
        headers: { "User-Agent": "web:preve:1.0.0 (health check)", Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
        ok = true;
        host = h;
        break;
      }
    } catch {
      // unreachable host — try the next
    }
  }

  cached = { at: Date.now(), body: { ok, host } };
  return NextResponse.json(cached.body);
}
