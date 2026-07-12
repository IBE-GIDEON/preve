import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "../auth/redirect";
import { getSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const pathname = request.nextUrl.pathname;

  if (isLocalPreviewAuthBypassEnabled()) {
    return NextResponse.next({ request });
  }

  if (!env) {
    if (!isProtectedPath(pathname)) return NextResponse.next({ request });

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("error", "auth_not_configured");
    redirectUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const hasValidUser = Boolean(data.user && !error);

  if (isProtectedPath(pathname) && !hasValidUser) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${request.nextUrl.search}`));
    return NextResponse.redirect(redirectUrl);
  }

  if ((pathname === "/auth" || pathname.startsWith("/auth/")) && hasValidUser) {
    const redirectUrl = new URL(getSafeRedirectPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
