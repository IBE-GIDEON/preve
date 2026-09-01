import { NextResponse } from "next/server";
import { chatComplete, hasAiEnv } from "../../../lib/ai";
import { createClient } from "../../../lib/supabase/server";

export const maxDuration = 60;

// Best-effort per-user rate limit (per warm serverless instance). Keeps a
// single user from burning the free AI quota; a durable limiter is backlogged.
const usage = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;

interface UsageInfo {
  limited: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
}

// Records this attempt and reports how much of the window is left, so the UI
// can show the user their remaining AI actions.
function recordUsage(userId: string): UsageInfo {
  const now = Date.now();
  const stamps = (usage.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  const resetIn = (list: number[]) =>
    list.length ? Math.max(1, Math.ceil((WINDOW_MS - (now - list[0])) / 1000)) : Math.ceil(WINDOW_MS / 1000);

  if (stamps.length >= MAX_PER_WINDOW) {
    usage.set(userId, stamps);
    return { limited: true, remaining: 0, limit: MAX_PER_WINDOW, resetInSeconds: resetIn(stamps) };
  }
  stamps.push(now);
  usage.set(userId, stamps);
  return { limited: false, remaining: MAX_PER_WINDOW - stamps.length, limit: MAX_PER_WINDOW, resetInSeconds: resetIn(stamps) };
}

function usagePayload(info: UsageInfo) {
  return { remaining: info.remaining, limit: info.limit, resetInSeconds: info.resetInSeconds };
}

// Durable limiter backed by Postgres (record_ai_usage RPC) so the cap is shared
// across every serverless instance and survives cold starts — the in-memory
// Map above can't do either. Falls back to that Map if the migration isn't
// applied yet, so AI keeps working either way.
let durableLimiterAvailable = true;

async function recordAiUsage(supabase: Awaited<ReturnType<typeof createClient>>): Promise<UsageInfo | null> {
  if (!durableLimiterAvailable) return null;
  const { data, error } = await supabase.rpc("record_ai_usage", {
    max_per_window: MAX_PER_WINDOW,
    window_seconds: Math.floor(WINDOW_MS / 1000),
  });
  if (error || !data) {
    // Function missing (migration not applied) → stop retrying on this instance.
    if (error?.code === "PGRST202" || /record_ai_usage|function/i.test(error?.message ?? "")) {
      durableLimiterAvailable = false;
    }
    return null;
  }
  const row = data as { allowed?: boolean; remaining?: number; limit?: number; reset_in?: number };
  return {
    limited: row.allowed === false,
    remaining: typeof row.remaining === "number" ? Math.max(0, row.remaining) : 0,
    limit: typeof row.limit === "number" ? row.limit : MAX_PER_WINDOW,
    resetInSeconds: typeof row.reset_in === "number" ? row.reset_in : Math.floor(WINDOW_MS / 1000),
  };
}

export interface PostSuggestion {
  source: number; // 1-based index into the sources the client sent
  platform: string;
  post: string;
}

// Reasoning models (e.g. gpt-oss) can wrap output in <think> blocks — strip them.
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim();
}

// Pull a JSON value out of a model response even if it's fenced, prefixed with
// reasoning/prose, or the model returned an object instead of a bare array.
function extractJson(raw: string): unknown {
  let text = stripReasoning(raw);
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    /* fall through to substring extraction */
  }
  const o1 = text.indexOf("{");
  const o2 = text.lastIndexOf("}");
  if (o1 !== -1 && o2 > o1) {
    try {
      return JSON.parse(text.slice(o1, o2 + 1));
    } catch {
      /* try array next */
    }
  }
  const a1 = text.indexOf("[");
  const a2 = text.lastIndexOf("]");
  if (a1 !== -1 && a2 > a1) {
    try {
      return JSON.parse(text.slice(a1, a2 + 1));
    } catch {
      /* give up */
    }
  }
  return null;
}

function parseSuggestions(raw: string, maxSource: number): PostSuggestion[] {
  const parsed = extractJson(raw);

  let arr: unknown[] = [];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const candidate = o.ideas ?? o.posts ?? o.suggestions ?? o.results;
    if (Array.isArray(candidate)) arr = candidate;
  }
  if (arr.length === 0) return [];

  const out: PostSuggestion[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const post =
      typeof o.post === "string" ? o.post.trim() : typeof o.text === "string" ? o.text.trim() : "";
    if (!post) continue;
    let source = Math.floor(Number(o.source));
    if (!Number.isFinite(source) || source < 1 || source > maxSource) source = 1;
    const platform = typeof o.platform === "string" ? o.platform.slice(0, 40) : "";
    out.push({ source, platform, post: post.slice(0, 4000) });
  }
  return out.slice(0, 6);
}

const PROMPTS: Record<string, string> = {
  summarize: "You are a concise editor. Summarize the user's post in 2 short sentences. Return only the summary.",
  rewrite:
    "You are a sharp copy editor. Rewrite the user's post to be clearer and more engaging while keeping the meaning and the author's voice. Return only the rewritten text.",
  expand:
    "Expand the user's post into a richer, well-structured piece while keeping the core idea and voice. Return only the expanded text.",
};

// Appended to every generation prompt so output reads like a person wrote it,
// not like AI. These govern the writing itself (voice, punctuation, word choice).
const HUMAN_STYLE = `Write so it reads like a real person wrote it, never like AI. Follow these strictly:
- No emojis, icons, or decorative symbols.
- No markdown, asterisks, bold, or headings.
- No em dashes, and never use a hyphen as a dash; only use a hyphen inside a compound word such as well-known or long-term.
- No ellipses, no double exclamation marks, no ALL-CAPS for emphasis.
- Mix short and medium sentences and vary how they open; avoid repetitive structure.
- Cut filler and hedging: no "in conclusion", "overall", "it's worth noting", "as mentioned", "let's dive in", "here's the thing", "at the end of the day".
- Avoid AI-tell words: delve, tapestry, testament, landscape, realm, leverage, elevate, unlock, seamless, robust, game-changer, foster, underscore, and figurative "navigate".
- No "it's not just X, it's Y" constructions, and no forced lists of three.
- Keep the wording natural, not too fancy and not too plain; contractions are fine.
- Be direct. Do not over-explain, moralize, or tack on a wrap-up line.
- Do not restate the request or explain what you are doing.`;

export async function POST(request: Request) {
  if (!hasAiEnv()) {
    return NextResponse.json({ error: "AI isn't configured yet. Add an AI_API_KEY." }, { status: 400 });
  }

  // Require a signed-in user so the AI key can't be abused anonymously.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const usageInfo = (await recordAiUsage(supabase)) ?? recordUsage(data.user.id);
  if (usageInfo.limited) {
    const mins = Math.max(1, Math.round(usageInfo.resetInSeconds / 60));
    return NextResponse.json(
      {
        error: `You've used all ${usageInfo.limit} AI actions for now — resets in about ${mins} min.`,
        usage: usagePayload(usageInfo),
      },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    text?: string;
    format?: string;
    samples?: string[];
    sources?: Array<{ text?: string; platform?: string }>;
    count?: number;
    platforms?: string[];
  };
  const action = body.action ?? "";

  // "suggest" (preve Posts) — ground fresh post ideas in the user's archive and
  // return a structured list, each tied to the past post it builds on.
  if (action === "suggest") {
    const rawSources = Array.isArray(body.sources) ? body.sources : [];
    const sources = rawSources
      .filter((s): s is { text?: string; platform?: string } => !!s && typeof s === "object" && typeof s.text === "string")
      .slice(0, 12)
      .map((s, i) => ({
        n: i + 1,
        text: String(s.text).replace(/\s+/g, " ").trim().slice(0, 800),
        platform: typeof s.platform === "string" ? s.platform.slice(0, 40) : "",
      }))
      .filter((s) => s.text.length > 0);

    if (sources.length === 0) {
      return NextResponse.json(
        { error: "Import some posts first — the AI needs your history to riff on.", usage: usagePayload(usageInfo) },
        { status: 400 },
      );
    }

    const count = Math.min(6, Math.max(1, Number(body.count) || 4));
    const allowedPlatforms = Array.isArray(body.platforms)
      ? body.platforms.filter((p): p is string => typeof p === "string" && p.trim().length > 0).slice(0, 12)
      : [];
    const list = sources.map((s) => `[${s.n}]${s.platform ? ` (${s.platform})` : ""} ${s.text}`).join("\n\n");
    const platformRule = allowedPlatforms.length
      ? ` The "platform" value MUST be exactly one of: ${allowedPlatforms.join(", ")}.`
      : "";
    const system =
      "You are the user's ghostwriter. Study their past posts and propose brand-new posts they could publish next, in their voice: same tone, vocabulary, and rhythm. Each idea must be inspired by exactly ONE of the numbered past posts. Respond with a single JSON object of the form {\"ideas\": [{\"source\": <number of the past post it builds on>, \"platform\": \"<the single best platform for it>\", \"post\": \"<the ready-to-publish post text>\"}]}. No prose, no code fences, no commentary." +
      platformRule +
      `\n\n${HUMAN_STYLE}\nApply those writing rules to each "post" value. Return only the JSON object.`;
    const userMessage = `My past posts:\n${list}\n\nWrite ${count} new posts I could publish next. Vary the topics and angles across them.${allowedPlatforms.length ? ` Spread them across these platforms where it makes sense: ${allowedPlatforms.join(", ")}.` : ""} Return the JSON object only.`;

    try {
      const raw = await chatComplete(system, userMessage, { jsonMode: true, maxTokens: 2048 });
      const suggestions = parseSuggestions(raw, sources.length);
      if (suggestions.length === 0) {
        return NextResponse.json(
          { error: "The AI didn't return usable ideas — please try again.", usage: usagePayload(usageInfo) },
          { status: 502 },
        );
      }
      return NextResponse.json({ suggestions, usage: usagePayload(usageInfo) });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "AI request failed.", usage: usagePayload(usageInfo) },
        { status: 500 },
      );
    }
  }

  const text = (body.text ?? "").slice(0, 6000).trim();
  if (!text) return NextResponse.json({ error: "Nothing to work with." }, { status: 400 });

  const samples = Array.isArray(body.samples)
    ? body.samples.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 5)
    : [];

  let system: string;
  let userMessage = text;
  if (action === "repurpose") {
    const format = body.format || "thread";
    system = `Repurpose the user's post into a ${format} for social media. Keep the author's voice, make it engaging and native to that format. Return only the ${format}.`;
  } else if (action === "compose") {
    system =
      "You are the user's ghostwriter. Write a single social-media post from their brief, matching the voice, tone, vocabulary, and rhythm of the past posts they provide. Sound like them, not like an AI — no clichés, no hashtags unless they use them. Return only the post text.";
    const voice = samples.length
      ? `\n\nMy past posts (match this voice):\n---\n${samples.map((s) => s.slice(0, 500)).join("\n---\n")}`
      : "";
    userMessage = `Brief: ${text}${voice}`;
  } else if (PROMPTS[action]) {
    system = PROMPTS[action];
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  system = `${system}\n\n${HUMAN_STYLE}`;

  try {
    const result = stripReasoning(await chatComplete(system, userMessage));
    return NextResponse.json({ result, usage: usagePayload(usageInfo) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed.", usage: usagePayload(usageInfo) },
      { status: 500 },
    );
  }
}
