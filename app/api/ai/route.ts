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

export interface PostSuggestion {
  source: number; // 1-based index into the sources the client sent
  platform: string;
  post: string;
}

// The model is asked for a JSON array; be forgiving about fences/stray prose.
function parseSuggestions(raw: string, maxSource: number): PostSuggestion[] {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: PostSuggestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const post = typeof o.post === "string" ? o.post.trim() : "";
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

export async function POST(request: Request) {
  if (!hasAiEnv()) {
    return NextResponse.json({ error: "AI isn't configured yet. Add an AI_API_KEY." }, { status: 400 });
  }

  // Require a signed-in user so the AI key can't be abused anonymously.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const usageInfo = recordUsage(data.user.id);
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
    const list = sources.map((s) => `[${s.n}]${s.platform ? ` (${s.platform})` : ""} ${s.text}`).join("\n\n");
    const system =
      "You are the user's ghostwriter. Study their past posts and propose brand-new posts they could publish next, in their voice — same tone, vocabulary, and rhythm. Sound like them, never like an AI: no clichés, no emoji spam, no hashtags unless they use them. Each idea must be inspired by exactly ONE of the numbered past posts. Return ONLY a JSON array (no prose, no code fences). Each element: {\"source\": <number of the past post it builds on>, \"platform\": \"<the single best platform for it>\", \"post\": \"<the ready-to-publish post text>\"}.";
    const userMessage = `My past posts:\n${list}\n\nWrite ${count} new posts I could publish next. Vary the topics and angles across them. Return the JSON array only.`;

    try {
      const raw = await chatComplete(system, userMessage);
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

  try {
    const result = await chatComplete(system, userMessage);
    return NextResponse.json({ result, usage: usagePayload(usageInfo) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed.", usage: usagePayload(usageInfo) },
      { status: 500 },
    );
  }
}
