// Supabase Edge Function: embed text with the built-in, free `gte-small`
// model (384-dim). Runs on your Supabase infra — no external API quota.
//
// Deploy:  supabase functions deploy embed
// (or paste this in Dashboard -> Edge Functions -> embed -> Edit & Deploy)
//
// This is a Deno file and is excluded from the Next.js TypeScript build.

// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  try {
    // Only signed-in preve users may spend embedding quota. supabase-js
    // forwards the caller's JWT in the Authorization header automatically.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data?.user) {
      return Response.json({ error: "Not signed in." }, { status: 401 });
    }

    const { texts } = await req.json();
    if (!Array.isArray(texts) || texts.length > 300) {
      return Response.json({ error: "`texts` must be an array of up to 300 strings." }, { status: 400 });
    }

    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await model.run(String(text ?? "").slice(0, 4000), {
        mean_pool: true,
        normalize: true,
      });
      embeddings.push(embedding as number[]);
    }

    return Response.json({ embeddings });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
});
