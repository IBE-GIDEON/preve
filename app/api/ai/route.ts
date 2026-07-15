import { NextResponse } from "next/server";
import { chatComplete, hasAiEnv } from "../../../lib/ai";
import { createClient } from "../../../lib/supabase/server";

export const maxDuration = 60;

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
