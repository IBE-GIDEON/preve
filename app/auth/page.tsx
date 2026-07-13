import { Suspense } from "react";
import { getSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  const supabaseEnv = getSupabasePublicEnv();
  const bypass = isLocalPreviewAuthBypassEnabled();

  return (
    <Suspense fallback={null}>
      <AuthClient bypass={bypass} supabaseEnv={supabaseEnv} />
    </Suspense>
  );
}
