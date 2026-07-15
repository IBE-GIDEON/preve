// Server-only AI helper. Defaults to Groq (free, fast) but works with any
// OpenAI-compatible endpoint via AI_BASE_URL / AI_MODEL. Never import client-side.

const DEFAULT_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function hasAiEnv() {
  return Boolean(process.env.AI_API_KEY?.trim());
}

export async function chatComplete(system: string, user: string): Promise<string> {
  const key = process.env.AI_API_KEY!.trim();
  const base = process.env.AI_BASE_URL?.trim() || DEFAULT_BASE;
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status})${detail ? `: ${detail.slice(0, 140)}` : ""}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
