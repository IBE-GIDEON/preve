"use server";

import { revalidatePath } from "next/cache";
import { hasSupabasePublicEnv } from "../../../../lib/supabase/env";
import { createClient } from "../../../../lib/supabase/server";
import {
  SOCIAL_PLATFORMS,
  normalizeUsername,
  validateBio,
  validateUrl,
  validateUsername,
  type ProfileInput,
} from "../../../../lib/profile";

export interface ProfileResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Live username availability check (excludes the current user). */
export async function checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
  const invalid = validateUsername(username);
  if (invalid) return { available: false, reason: invalid };
  if (!hasSupabasePublicEnv()) return { available: true };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const normalized = normalizeUsername(username);

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (!data) return { available: true };
  return { available: data.id === userData.user?.id };
}

export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  if (!hasSupabasePublicEnv()) return { ok: true };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: "You're not signed in." };

  const fieldErrors: Record<string, string> = {};
  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);

  if (!fullName) fieldErrors.fullName = "Enter your name.";
  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  const websiteError = validateUrl(input.website, "website");
  if (websiteError) fieldErrors.website = websiteError;
  const bioError = validateBio(input.bio);
  if (bioError) fieldErrors.bio = bioError;

  const socialLinks: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = (input.socialLinks[platform.key] ?? "").trim();
    if (!value) continue;
    const error = validateUrl(value, platform.label);
    if (error) fieldErrors[`social_${platform.key}`] = error;
    else socialLinks[platform.key] = value;
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing && existing.id !== userData.user.id) {
    return { ok: false, fieldErrors: { username: "That username is taken." } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      username,
      bio: input.bio.trim() || null,
      website: input.website.trim() || null,
      social_links: socialLinks,
      is_public: input.isPublic,
    })
    .eq("id", userData.user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { username: "That username is taken." } };
    return { ok: false, error: error.message };
  }

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
