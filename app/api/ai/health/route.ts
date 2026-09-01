import { NextResponse } from "next/server";
import { hasAiEnv, healthCheck } from "../../../../lib/ai";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 30;

// Signed-in diagnostic: pings each configured AI provider so the founder can
// confirm which keys/models actually work. No secrets are returned.
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!hasAiEnv()) {
    return NextResponse.json({ providers: [], note: "No AI provider keys are configured." });
  }

  const providers = await healthCheck();
  const working = providers.filter((p) => p.ok).length;
  return NextResponse.json({ working, total: providers.length, providers });
}
