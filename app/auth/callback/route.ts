import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "../../../lib/auth/redirect";
import { createClient } from "../../../lib/supabase/server";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
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
      // Password recovery lands on a dedicated "set new password" screen.
      // (getSafeRedirectPath intentionally refuses /auth/* as a `next` target.)
      const destination = type === "recovery" ? "/auth/update-password" : next;
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  requestUrl.pathname = "/auth";
  requestUrl.search = "";
  requestUrl.searchParams.set("error", "callback_failed");
  return NextResponse.redirect(requestUrl);
}
