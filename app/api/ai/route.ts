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
  };
  const action = body.action ?? "";
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
