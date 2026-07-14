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

  const [profile, items, saved, accounts] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
    supabase.from("archive_items").select("*").order("created_at", { ascending: false }),
    supabase.from("saved_archive_items").select("archive_item_id"),
    supabase.from("connected_accounts").select("platform, platform_username, status, last_sync_at"),
  ]);

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      product: "preve",
      account: { id: userData.user.id, email: userData.user.email },
      profile: profile.data ?? null,
      archiveItems: items.data ?? [],
      savedItemIds: (saved.data ?? []).map((row) => row.archive_item_id),
      connectedAccounts: accounts.data ?? [],
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
