"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import { getSafeRedirectPath } from "../../lib/auth/redirect";
import { createClient } from "../../lib/supabase/client";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";

type AuthMode = "sign-in" | "sign-up";

function getErrorCopy(code: string | null) {
  if (code === "auth_not_configured") {
    return "Supabase Auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable real sign in.";
  }
  if (code === "callback_failed") {
    return "The auth callback could not complete. Try signing in again.";
  }
  return "";
}

export default function AuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = hasSupabasePublicEnv();
  const bypass = isLocalPreviewAuthBypassEnabled();
  const isBypassActive = !configured && bypass;
  
  const nextPath = getSafeRedirectPath(searchParams.get("next"), "/onboarding");
  const initialMode: AuthMode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(getErrorCopy(searchParams.get("error")));
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!supabase) {
      if (isBypassActive) {
        // Simulate a small network delay to make the flow realistic
        await new Promise((resolve) => setTimeout(resolve, 800));
        setLoading(false);
        router.push(nextPath);
        router.refresh();
      } else {
        setLoading(false);
        setMessage("Supabase is not configured yet.");
      }
      return;
    }

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setMessage("Check your email to confirm your account, then come back to sign in.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setMessage("");

    if (!supabase) {
      if (isBypassActive) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setLoading(false);
        router.push(nextPath);
        router.refresh();
      } else {
        setLoading(false);
        setMessage("Supabase is not configured yet.");
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
      setMessage(error.message);
    }
  }

  const isFormActive = configured || isBypassActive;

  return (
    <div className="app-container" style={{ flexDirection: "column" }}>
      <header style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="logo" style={{ marginBottom: 0, textDecoration: "none" }}>
          <img src="/images/preve-search-mark.svg" alt="" className="logo-mark" />
          <span>preve</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 2rem 4rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: "100%", maxWidth: "400px" }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1 
              style={{ 
                fontSize: "2.4rem", 
                fontFamily: "'Newsreader', Georgia, serif", 
                fontWeight: 500, 
                letterSpacing: "-0.01em", 
                marginBottom: "0.75rem" 
              }}
            >
              {mode === "sign-in" ? "Sign in to preve" : "Create your account"}
            </h1>
            <p style={{ opacity: 0.6, fontSize: "0.95rem", lineHeight: 1.5 }}>
              {mode === "sign-in"
                ? "Access your private archive and connected social sources."
                : "Start with a real account before importing your archive."}
            </p>
          </div>

          <div
            style={{
              border: "1px solid var(--input-border)",
              borderRadius: "16px",
              background: "var(--input-bg)",
              padding: "1.5rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.015)"
            }}
          >


            {message && (
              <div className="auth-alert error">
                {message}
              </div>
            )}

            <form onSubmit={handlePasswordAuth} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!isFormActive || loading}
                className="auth-input"
              />
              <input
                required
                minLength={8}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!isFormActive || loading}
                className="auth-input"
              />
              <button 
                disabled={!isFormActive || loading} 
                className="auth-primary-btn"
              >
                {loading ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              onClick={handleGoogleAuth}
              disabled={!isFormActive || loading}
              className="auth-google-btn"
            >
              <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 15.03 1 12 1 7.24 1 3.24 3.73 1.34 7.72l3.96 3.07C6.27 7.74 8.87 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.09 2.67-2.31 3.49l3.6 2.79c2.1-1.94 3.77-5.17 3.77-8.43z" />
                <path fill="#FBBC05" d="M5.3 14.21c-.24-.72-.38-1.49-.38-2.21s.14-1.49.38-2.21L1.34 6.72C.49 8.41 0 10.15 0 12s.49 3.59 1.34 5.28l3.96-3.07z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.6-2.79c-1.1.74-2.5 1.18-4.36 1.18-3.13 0-5.73-2.7-6.7-5.75L1.34 15.8C3.24 19.79 7.24 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setMessage("");
              }}
              className="auth-switch-btn"
            >
              {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
