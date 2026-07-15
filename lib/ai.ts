// Server-only AI helper. Tries Groq first (free, fast); if it fails or is
// rate-limited, automatically falls back to Gemini (free). Both use an
// OpenAI-compatible chat endpoint. Never import client-side.

interface Provider {
  name: string;
  key: string;
  base: string;
  model: string;
}

function providers(): Provider[] {
  const list: Provider[] = [];

  const groqKey = process.env.AI_API_KEY?.trim();
  if (groqKey) {
    list.push({
      name: "groq",
      key: groqKey,
      base: process.env.AI_BASE_URL?.trim() || "https://api.groq.com/openai/v1",
      model: process.env.AI_MODEL?.trim() || "llama-3.3-70b-versatile",
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    list.push({
      name: "gemini",
      key: geminiKey,
      base: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    });
  }

  return list;
}

export function hasAiEnv() {
  return providers().length > 0;
}

async function callProvider(provider: Provider, system: string, user: string): Promise<string> {
  const res = await fetch(`${provider.base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
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
    throw new Error(`${provider.name} ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Run a chat completion, falling back to the next provider on any failure. */
export async function chatComplete(system: string, user: string): Promise<string> {
  const list = providers();
  if (list.length === 0) throw new Error("AI isn't configured.");

  let lastError: Error | null = null;
  for (const provider of list) {
    try {
      return await callProvider(provider, system, user);
    } catch (error) {
      // Groq rate-limited or down -> try Gemini next.
      lastError = error instanceof Error ? error : new Error("AI request failed");
    }
  }
  throw lastError ?? new Error("AI request failed");
}
