/**
 * Turn raw Supabase auth errors into clean, human copy. Keeps technical
 * strings and browser-generic validation text out of the UI.
 */
export function friendlyAuthError(raw: string | null | undefined): string {
  const message = (raw ?? "").toLowerCase();
  if (!message) return "Something went wrong. Please try again.";

  if (message.includes("invalid login credentials")) {
    return "That email or password isn't right. Double-check and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email first — check your inbox for the link.";
  }
  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (message.includes("password should be at least") || message.includes("password is too short")) {
    return "Your password is too short. Use at least 8 characters.";
  }
  if (message.includes("weak password") || message.includes("password should contain")) {
    return "Please choose a stronger password.";
  }
  if (message.includes("rate limit") || message.includes("too many requests") || message.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (message.includes("unable to validate email") || message.includes("invalid email")) {
    return "That email address doesn't look valid.";
  }
  if (message.includes("signups not allowed") || message.includes("signup is disabled")) {
    return "New sign-ups are currently disabled. Contact support if you need access.";
  }
  if (message.includes("email link is invalid") || message.includes("expired") || message.includes("otp")) {
    return "That link is invalid or has expired. Please request a new one.";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  // Presentable fallback: use the raw message if it's short, else a safe default.
  return raw && raw.length < 120 ? raw : "Something went wrong. Please try again.";
}

/** Copy for error codes passed via the `?error=` query param. */
export function authErrorCodeCopy(code: string | null): string {
  switch (code) {
    case "auth_not_configured":
      return "Sign in isn't available right now. Please try again shortly.";
    case "callback_failed":
      return "We couldn't finish signing you in. Please try again.";
    default:
      return "";
  }
}
