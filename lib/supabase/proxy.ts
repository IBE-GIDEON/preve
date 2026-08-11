import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "../auth/redirect";
import { getSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Build a redirect while carrying over any auth cookies that Supabase set on
 * `response` during `getUser()`. Skipping this drops the refreshed session and
 * logs the user out on redirect.
 */
function redirectWithSession(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expires: cookie.expires,
      maxAge: cookie.maxAge,
    });
  });
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const { pathname, search, origin } = request.nextUrl;

  if (isLocalPreviewAuthBypassEnabled()) {
    return NextResponse.next({ request });
  }

  // Env missing: only guard protected routes, send them to the config notice.
  if (!env) {
    if (!isProtectedPath(pathname)) return NextResponse.next({ request });

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "auth_not_configured");
    redirectUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${search}`));
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
  const user = data.user && !error ? data.user : null;

  // Unauthenticated visitor on a protected route -> sign in.
  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${search}`));
    return redirectWithSession(redirectUrl, response);
  }

  // Signed-in user on the sign-in page -> into the app. Where they actually land
  // is settled by the pages themselves: /dashboard sends anyone without a
  // registered company to /onboarding, and /onboarding sends anyone with one
  // back. Deliberately no onboarding rule here — middleware can only cheaply
  // read `user_metadata.onboarded`, and whenever that flag disagreed with the
  // `companies` table the two layers redirected at each other forever. Every
  // pre-pivot account is in exactly that state (flag set, no company row), so
  // the loop was not hypothetical.
  if (pathname === "/auth" && user) {
    const target = getSafeRedirectPath(request.nextUrl.searchParams.get("next"), "/dashboard");
    return redirectWithSession(new URL(target, origin), response);
  }

  return response;
}
