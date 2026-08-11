// Matching prompt + response parsing. Kept out of the route handler so the
// parsing rules can be exercised without a request or an AI key.

export const MATCH_SYSTEM = `You are a B2B procurement analyst. You receive a company profile and a business need.
1. Qualify the need: infer the company's situation, scale, risk profile, and what actually matters in a provider.
2. Recommend the 4 best-fit providers (real, well-known companies or firms; if the market is fragmented, name the leading category specialist type instead).
Respond with STRICT JSON only — no markdown, no code fences — exactly this shape:
{"qualification":{"summary":"...","signals":["...","..."]},"providers":[{"name":"...","match":94,"why":"...","considerations":"..."}]}
Rules: "match" is an integer 60-99 reflecting fit. "why" explains the fit in one sentence referencing the company's profile. "considerations" is one short caveat. Keep every string under 200 characters. 3-5 signals, exactly 4 providers, sorted by match descending.`;

export interface MatchResult {
  qualification: { summary: string; signals: string[] };
  providers: { name: string; match: number; why: string; considerations: string }[];
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Models wrap JSON in prose or code fences often enough that we slice out the
 * outermost object rather than trusting the response to be bare JSON. Returns
 * null when nothing usable came back, so the caller can surface a retry.
 */
export function parseMatch(raw: string): MatchResult | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const root = parsed as Record<string, unknown>;
  const qualification = (root.qualification ?? {}) as Record<string, unknown>;
  const providers = Array.isArray(root.providers) ? root.providers : [];

  const clean = providers
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      name: str(p.name),
      // Clamp so a stray score can't overflow the score bar in the UI.
      match: Math.max(0, Math.min(99, Math.round(Number(p.match)) || 0)),
      why: str(p.why),
      considerations: str(p.considerations),
    }))
    .filter((p) => p.name)
    .sort((a, b) => b.match - a.match);

  if (clean.length === 0) return null;

  return {
    qualification: {
      summary: str(qualification.summary),
      signals: (Array.isArray(qualification.signals) ? qualification.signals : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 5),
    },
    providers: clean.slice(0, 5),
  };
}
