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
      // llama-3.3-70b-versatile was deprecated 2026-06-17; gpt-oss-120b is
      // Groq's recommended free replacement. Override with AI_MODEL if needed.
      model: process.env.AI_MODEL?.trim() || "openai/gpt-oss-120b",
    });
  }

  // Cerebras: very fast, generous free token budget. Model overridable.
  const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim();
  if (cerebrasKey) {
    list.push({
      name: "cerebras",
      key: cerebrasKey,
      base: process.env.CEREBRAS_BASE_URL?.trim() || "https://api.cerebras.ai/v1",
      model: process.env.CEREBRAS_MODEL?.trim() || "llama-3.3-70b",
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    list.push({
      name: "gemini",
      key: geminiKey,
      base: "https://generativelanguage.googleapis.com/v1beta/openai",
      // gemini-2.0-flash was shut down 2026-06-01; gemini-flash-latest auto-tracks
      // the current flash model so it won't hard-404 again. Override w/ GEMINI_MODEL.
      model: process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
    });
  }

  // A second Gemini project key = another free daily pool at zero extra code.
  const geminiKey2 = process.env.GEMINI_API_KEY_2?.trim();
  if (geminiKey2) {
    list.push({
      name: "gemini2",
      key: geminiKey2,
      base: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: process.env.GEMINI_MODEL_2?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
    });
  }

  const mistralKey = process.env.MISTRAL_API_KEY?.trim();
  if (mistralKey) {
    list.push({
      name: "mistral",
      key: mistralKey,
      base: process.env.MISTRAL_BASE_URL?.trim() || "https://api.mistral.ai/v1",
      model: process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest",
    });
  }

  // OpenRouter: one key, many ":free" models. Set OPENROUTER_MODEL to a current
  // free model id (the specific free models rotate over time).
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    list.push({
      name: "openrouter",
      key: openrouterKey,
      base: process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct:free",
    });
  }

  return list;
}

export function hasAiEnv() {
  return providers().length > 0;
}

export interface CompleteOptions {
  /** Force the model to return a single JSON object (response_format). */
  jsonMode?: boolean;
  /** Override the default 1024 output-token cap (e.g. multi-item JSON). */
  maxTokens?: number;
}

async function callProvider(
  provider: Provider,
  system: string,
  user: string,
  options?: CompleteOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  };
  if (options?.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${provider.base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${provider.name} ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// Rotates the starting provider each call so load spreads across every free
// tier's per-minute/day limits instead of always hammering the first one.
let rotation = 0;

/** Run a chat completion, rotating start + falling back on any failure. */
export async function chatComplete(system: string, user: string, options?: CompleteOptions): Promise<string> {
  const list = providers();
  if (list.length === 0) throw new Error("AI isn't configured.");

  const start = list.length > 1 ? rotation++ % list.length : 0;
  const ordered = start === 0 ? list : [...list.slice(start), ...list.slice(0, start)];

  let lastError: Error | null = null;
  for (const provider of ordered) {
    try {
      return await callProvider(provider, system, user, options);
    } catch (error) {
      // This provider is down or rate-limited -> try the next one.
      lastError = error instanceof Error ? error : new Error("AI request failed");
    }
  }
  throw lastError ?? new Error("AI request failed");
}

/** Names of the providers currently configured (by which key envs are set). */
export function providerNames(): string[] {
  return providers().map((p) => p.name);
}

export interface ProviderHealth {
  name: string;
  model: string;
  ok: boolean;
  ms: number;
  error?: string;
}

/** Ping every configured provider with a tiny call to see which actually work. */
export async function healthCheck(): Promise<ProviderHealth[]> {
  const list = providers();
  return Promise.all(
    list.map(async (p): Promise<ProviderHealth> => {
      const start = Date.now();
      try {
        await callProvider(p, "You are a health check.", "Reply with the single word: ok", { maxTokens: 5 });
        return { name: p.name, model: p.model, ok: true, ms: Date.now() - start };
      } catch (error) {
        return {
          name: p.name,
          model: p.model,
          ok: false,
          ms: Date.now() - start,
          error: error instanceof Error ? error.message.slice(0, 200) : "failed",
        };
      }
    }),
  );
}
