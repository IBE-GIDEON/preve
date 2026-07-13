import { Suspense } from "react";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  const configured = hasSupabasePublicEnv();
  const bypass = isLocalPreviewAuthBypassEnabled();

  return (
    <Suspense fallback={null}>
      <AuthClient configured={configured} bypass={bypass} />
    </Suspense>
  );
}
