import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "../../../lib/auth/redirect";
import { createClient } from "../../../lib/supabase/server";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  if (!hasSupabasePublicEnv()) {
    requestUrl.pathname = "/auth";
    requestUrl.search = "";
    requestUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(requestUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  requestUrl.pathname = "/auth";
  requestUrl.search = "";
  requestUrl.searchParams.set("error", "callback_failed");
  return NextResponse.redirect(requestUrl);
}
