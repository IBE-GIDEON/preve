import { NextResponse } from "next/server";
import { chatComplete, hasAiEnv } from "../../../lib/ai";
import { createClient } from "../../../lib/supabase/server";

export const maxDuration = 60;

// Best-effort per-user rate limit (per warm serverless instance). Keeps a
// single user from burning the free AI quota; a durable limiter is backlogged.
const usage = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const stamps = (usage.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) {
    usage.set(userId, stamps);
    return true;
  }
  stamps.push(now);
  usage.set(userId, stamps);
  return false;
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
  if (isRateLimited(data.user.id)) {
    return NextResponse.json(
      { error: "You're moving fast — give the AI a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    text?: string;
    format?: string;
  };
  const action = body.action ?? "";
  const text = (body.text ?? "").slice(0, 6000).trim();
  if (!text) return NextResponse.json({ error: "Nothing to work with." }, { status: 400 });

  let system: string;
  if (action === "repurpose") {
    const format = body.format || "thread";
    system = `Repurpose the user's post into a ${format} for social media. Keep the author's voice, make it engaging and native to that format. Return only the ${format}.`;
  } else if (PROMPTS[action]) {
    system = PROMPTS[action];
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  try {
    const result = await chatComplete(system, text);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed." },
      { status: 500 },
    );
  }
}
