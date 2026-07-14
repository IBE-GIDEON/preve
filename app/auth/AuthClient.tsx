"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import AuthShell from "./AuthShell";
import { getSafeRedirectPath } from "../../lib/auth/redirect";
import { authErrorCodeCopy, friendlyAuthError } from "../../lib/auth/error-messages";
import { PASSWORD_HINT, validateEmail, validatePassword, type AuthMode } from "../../lib/auth/validation";
import { createClient } from "../../lib/supabase/client";
import type { SupabasePublicEnv } from "../../lib/supabase/env";

type Banner = { type: "error" | "info"; text: string } | null;

interface AuthClientProps {
  bypass: boolean;
  supabaseEnv: SupabasePublicEnv | null;
}

export default function AuthClient({ bypass, supabaseEnv }: AuthClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = Boolean(supabaseEnv);
  const isBypassActive = !configured && bypass;

  const nextPath = getSafeRedirectPath(searchParams.get("next"), "/onboarding");
  const initialMode: AuthMode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [banner, setBanner] = useState<Banner>(() => {
    const text = authErrorCodeCopy(searchParams.get("error"));
    return text ? { type: "error", text } : null;
  });
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => {
    if (!supabaseEnv) return null;
    try {
      return createClient(supabaseEnv);
    } catch {
      return null;
    }
  }, [supabaseEnv]);

  function validate() {
    const errors = {
      email: validateEmail(email),
      password: validatePassword(password, mode),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  }

  // Validate a single field on blur so format problems surface before submit.
  function validateField(field: "email" | "password") {
    const message = field === "email" ? validateEmail(email) : validatePassword(password, mode);
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    if (!validate()) return;

    setLoading(true);

    if (!supabase) {
      if (isBypassActive) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        router.push(nextPath);
        router.refresh();
      } else {
        setLoading(false);
        setBanner({ type: "error", text: "Sign in isn't available right now. Please try again shortly." });
      }
      return;
    }

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          });

    setLoading(false);

    if (result.error) {
      setBanner({ type: "error", text: friendlyAuthError(result.error.message) });
      return;
    }

    if (mode === "sign-up") {
      // Supabase hides "email already registered" behind a normal-looking
      // response (to prevent email enumeration): a user with an empty
      // `identities` array and no session. Detect that and say so clearly.
      const alreadyRegistered = result.data.user?.identities?.length === 0;
      if (alreadyRegistered) {
        setBanner({
          type: "error",
          text: "An account with that email already exists. Try signing in instead.",
        });
        return;
      }

      if (!result.data.session) {
        setBanner({
          type: "info",
          text: "Almost there — check your email to confirm your account, then sign in.",
        });
        return;
      }
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleAuth() {
    setBanner(null);
    setLoading(true);

    if (!supabase) {
      if (isBypassActive) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        router.push(nextPath);
        router.refresh();
      } else {
        setLoading(false);
        setBanner({ type: "error", text: "Sign in isn't available right now. Please try again shortly." });
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setLoading(false);
      setBanner({ type: "error", text: friendlyAuthError(error.message) });
    }
  }

  function switchMode() {
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setBanner(null);
    setFieldErrors({});
  }

  return (
    <AuthShell
      title={mode === "sign-in" ? "Sign in to preve" : "Create your account"}
      subtitle={
        mode === "sign-in"
          ? "Access your private archive and connected social sources."
          : "Start with a real account before importing your archive."
      }
    >
      {banner && (
        <div className={`auth-alert ${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
          {banner.text}
        </div>
      )}

      <form onSubmit={handlePasswordAuth} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  onBlur={() => validateField("email")}
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={`auth-input${fieldErrors.email ? " invalid" : ""}`}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="auth-field-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    placeholder="Password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    onBlur={() => validateField("password")}
                    disabled={loading}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={`auth-input${fieldErrors.password ? " invalid" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="auth-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="password-error" className="auth-field-error">
                    {fieldErrors.password}
                  </p>
                ) : mode === "sign-up" ? (
                  <p className="auth-field-hint">{PASSWORD_HINT}</p>
                ) : null}
              </div>

              {mode === "sign-in" && (
                <div style={{ textAlign: "right", marginTop: "-0.3rem" }}>
                  <Link href="/auth/reset" className="auth-inline-link">
                    Forgot password?
                  </Link>
                </div>
              )}

              <button disabled={loading} className="auth-primary-btn">
                {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button onClick={handleGoogleAuth} disabled={loading} className="auth-google-btn">
              <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 15.03 1 12 1 7.24 1 3.24 3.73 1.34 7.72l3.96 3.07C6.27 7.74 8.87 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.09 2.67-2.31 3.49l3.6 2.79c2.1-1.94 3.77-5.17 3.77-8.43z" />
                <path fill="#FBBC05" d="M5.3 14.21c-.24-.72-.38-1.49-.38-2.21s.14-1.49.38-2.21L1.34 6.72C.49 8.41 0 10.15 0 12s.49 3.59 1.34 5.28l3.96-3.07z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.79c-1.1.74-2.5 1.18-4.36 1.18-3.13 0-5.73-2.7-6.7-5.75L1.34 15.8C3.24 19.79 7.24 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button onClick={switchMode} className="auth-switch-btn">
              {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
    </AuthShell>
  );
}
