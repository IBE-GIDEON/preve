"use server";

import { createAdminClient, hasServiceRoleKey } from "../../../lib/supabase/admin";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";

export async function exportUserData(): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  if (!hasSupabasePublicEnv()) {
    return { ok: true, data: { note: "Preview mode — no account data." } };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You're not signed in." };

  // RLS scopes both company reads to this user, so no owner filter is needed —
  // and match runs come back with the reasoning, which is the part worth keeping.
  const [profile, companies, matches] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
    supabase.from("companies").select("*").order("created_at", { ascending: false }),
    supabase.from("match_requests").select("*").order("created_at", { ascending: false }),
  ]);

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      product: "preve",
      account: { id: userData.user.id, email: userData.user.email },
      profile: profile.data ?? null,
      companies: companies.data ?? [],
      matchRequests: matches.data ?? [],
    },
  };
}

/**
 * Permanently delete the current user and all their data (cascades via FK).
 * Requires the service role key — deleting an auth user is an admin operation.
 */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabasePublicEnv()) return { ok: false, error: "Not available in preview mode." };
  if (!hasServiceRoleKey()) {
    return { ok: false, error: "Account deletion isn't configured. Add SUPABASE_SERVICE_ROLE_KEY." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "You're not signed in." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Account deletion isn't configured." };

  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}
