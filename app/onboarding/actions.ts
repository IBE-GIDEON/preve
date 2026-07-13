"use server";

import { hasSupabasePublicEnv } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

/**
 * Mark the current user as having finished onboarding. Stored on the Supabase
 * user (account-level, survives across devices) so the proxy can keep them out
 * of the onboarding flow from then on.
 */
export async function completeOnboarding(): Promise<{ ok: boolean; error?: string }> {
  // No-op in local preview / bypass mode where Supabase isn't configured.
  if (!hasSupabasePublicEnv()) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { onboarded: true } });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
