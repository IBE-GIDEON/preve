import { NextResponse } from "next/server";
import { hasAiEnv, healthCheck } from "../../../../lib/ai";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 30;

// Admin-only diagnostic: pings each configured AI provider (one real call per
// provider), so it must stay gated — otherwise any signed-in user could loop it
// to drain the free quotas/paid credits. Allowed emails come from ADMIN_EMAILS
// (comma-separated) in the environment; if unset, nobody is allowed.
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = data.user.email?.toLowerCase() ?? "";
  if (admins.length === 0 || !admins.includes(email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (!hasAiEnv()) {
    return NextResponse.json({ providers: [], note: "No AI provider keys are configured." });
  }

  const providers = await healthCheck();
  const working = providers.filter((p) => p.ok).length;
  return NextResponse.json({ working, total: providers.length, providers });
}
