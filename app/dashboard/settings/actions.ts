"use server";

import { revalidatePath } from "next/cache";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";

/** Update the signed-in user's display name (profiles row + auth metadata). */
export async function updateProfileName(fullName: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = fullName.trim();
  if (!trimmed) return { ok: false, error: "Enter a name." };
  if (trimmed.length > 80) return { ok: false, error: "That name is too long." };

  if (!hasSupabasePublicEnv()) return { ok: true };

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { ok: false, error: "You're not signed in." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", data.user.id);
  if (profileError) return { ok: false, error: profileError.message };

  // Keep auth metadata in sync so the sidebar name updates too.
  await supabase.auth.updateUser({ data: { full_name: trimmed } });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
