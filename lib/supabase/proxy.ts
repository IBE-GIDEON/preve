import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "../auth/redirect";
import { getSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
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
  const isOnboarded = Boolean(user?.user_metadata?.onboarded);

  // Unauthenticated visitor on a protected route -> sign in.
  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", getSafeRedirectPath(`${pathname}${search}`));
    return redirectWithSession(redirectUrl, response);
  }

  // Signed-in user on the sign-in page -> forward to the right place.
  if (pathname === "/auth" && user) {
    const target = isOnboarded
      ? getSafeRedirectPath(request.nextUrl.searchParams.get("next"), "/dashboard")
      : "/onboarding";
    return redirectWithSession(new URL(target, origin), response);
  }

  // Already-onboarded users should never see onboarding again.
  if (isOnboardingPath(pathname) && user && isOnboarded) {
    return redirectWithSession(new URL("/dashboard", origin), response);
  }

  return response;
}
