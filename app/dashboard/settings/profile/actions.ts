"use server";

import { revalidatePath } from "next/cache";
import { hasSupabasePublicEnv } from "../../../../lib/supabase/env";
import { createClient } from "../../../../lib/supabase/server";
import { validateFullName, type ProfileInput } from "../../../../lib/profile";

export interface ProfileResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  if (!hasSupabasePublicEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "You're not signed in." };

  const fullName = input.fullName.trim();
  const nameError = validateFullName(fullName);
  if (nameError) return { ok: false, fieldErrors: { fullName: nameError } };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userData.user.id);

  if (error) return { ok: false, error: error.message };

  // Mirrored onto the auth user so the sidebar and layout can render a name
  // without a profiles read on every request.
  await supabase.auth.updateUser({ data: { full_name: fullName } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Persist a freshly uploaded avatar URL (upload itself happens client-side). */
export async function updateAvatar(url: string): Promise<ProfileResult> {
  if (!hasSupabasePublicEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "You're not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url || null })
    .eq("id", userData.user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.auth.updateUser({ data: { avatar_url: url || null } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
