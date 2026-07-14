"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthShell from "../AuthShell";
import { friendlyAuthError } from "../../../lib/auth/error-messages";
import { PASSWORD_HINT, validatePassword } from "../../../lib/auth/validation";
import { createClient } from "../../../lib/supabase/client";
import type { SupabasePublicEnv } from "../../../lib/supabase/env";

type Banner = { type: "error" | "info"; text: string } | null;

export default function UpdatePasswordClient({ supabaseEnv }: { supabaseEnv: SupabasePublicEnv | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(false);
  // null = checking, true = recovery session present, false = invalid/expired link
  const [ready, setReady] = useState<boolean | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseEnv) return null;
    try {
      return createClient(supabaseEnv);
    } catch {
      return null;
    }
  }, [supabaseEnv]);

  useEffect(() => {
    if (!supabase) {
      setReady(false);
      return;
    }
    supabase.auth.getUser().then(({ data, error }) => setReady(Boolean(data.user && !error)));
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    const passwordError = validatePassword(password, "sign-up");
    const confirmError = confirm !== password ? "Passwords don't match." : undefined;
    setErrors({ password: passwordError, confirm: confirmError });
    if (passwordError || confirmError) return;

    if (!supabase) {
      setBanner({ type: "error", text: "Password reset isn't available right now." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setBanner({ type: "error", text: friendlyAuthError(error.message) });
      return;
    }

    setBanner({ type: "info", text: "Password updated. Signing you in..." });
    router.push("/dashboard");
    router.refresh();
  }

  if (ready === false) {
    return (
      <AuthShell title="Link expired" subtitle="This password reset link is invalid or has expired.">
        <div className="auth-alert error" role="alert">
          Reset links can only be used once and expire after a short time.
        </div>
        <div style={{ textAlign: "center", marginTop: "1.1rem" }}>
          <Link href="/auth/reset" className="auth-inline-link">
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      {banner && (
        <div className={`auth-alert ${banner.type}`} role={banner.type === "error" ? "alert" : "status"}>
          {banner.text}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <div className="auth-password-wrap">
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password, "sign-up") }))}
              disabled={loading || ready === null}
              aria-invalid={Boolean(errors.password)}
              className={`auth-input${errors.password ? " invalid" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              className="auth-password-toggle"
              aria-label={show ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password ? (
            <p className="auth-field-error">{errors.password}</p>
          ) : (
            <p className="auth-field-hint">{PASSWORD_HINT}</p>
          )}
        </div>

        <div>
          <input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            disabled={loading || ready === null}
            aria-invalid={Boolean(errors.confirm)}
            className={`auth-input${errors.confirm ? " invalid" : ""}`}
          />
          {errors.confirm && <p className="auth-field-error">{errors.confirm}</p>}
        </div>

        <button disabled={loading || ready === null} className="auth-primary-btn">
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
