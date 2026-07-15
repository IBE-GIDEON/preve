// Supabase Edge Function: embed text with the built-in, free `gte-small`
// model (384-dim). Runs on your Supabase infra — no external API quota.
//
// Deploy:  supabase functions deploy embed
// (or paste this in Dashboard -> Edge Functions -> New function "embed")
//
// This is a Deno file and is excluded from the Next.js TypeScript build.

// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  try {
    const { texts } = await req.json();
    if (!Array.isArray(texts)) {
      return Response.json({ error: "`texts` must be an array of strings." }, { status: 400 });
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
