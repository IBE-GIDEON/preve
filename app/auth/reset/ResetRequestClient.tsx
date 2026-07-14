"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import AuthShell from "../AuthShell";
import { friendlyAuthError } from "../../../lib/auth/error-messages";
import { validateEmail } from "../../../lib/auth/validation";
import { createClient } from "../../../lib/supabase/client";
import type { SupabasePublicEnv } from "../../../lib/supabase/env";

type Banner = { type: "error" | "info"; text: string } | null;

export default function ResetRequestClient({ supabaseEnv }: { supabaseEnv: SupabasePublicEnv | null }) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = useMemo(() => {
    if (!supabaseEnv) return null;
    try {
      return createClient(supabaseEnv);
    } catch {
      return null;
    }
  }, [supabaseEnv]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    const error = validateEmail(email);
    setFieldError(error);
    if (error) return;

    setLoading(true);
    if (!supabase) {
      setLoading(false);
      setBanner({ type: "error", text: "Password reset isn't available right now. Please try again shortly." });
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setLoading(false);

    if (resetError) {
      setBanner({ type: "error", text: friendlyAuthError(resetError.message) });
      return;
    }
    // Always show the same message whether or not the email exists (no account enumeration).
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      {banner && (
        <div className={`auth-alert ${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
          {banner.text}
        </div>
      )}

      {sent ? (
        <div className="auth-alert info" role="status">
          If an account exists for {email.trim()}, a password reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldError) setFieldError(undefined);
              }}
              onBlur={() => setFieldError(validateEmail(email))}
              disabled={loading}
              aria-invalid={Boolean(fieldError)}
              className={`auth-input${fieldError ? " invalid" : ""}`}
            />
            {fieldError && <p className="auth-field-error">{fieldError}</p>}
          </div>
          <button disabled={loading} className="auth-primary-btn">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <div style={{ textAlign: "center", marginTop: "1.1rem" }}>
        <Link href="/auth" className="auth-inline-link">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
