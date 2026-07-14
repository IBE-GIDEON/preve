import { hasSupabasePublicEnv } from "../../../../lib/supabase/env";
import { createClient } from "../../../../lib/supabase/server";
import ProfileForm, { type ProfileFormData } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let initial: ProfileFormData | null = null;
  let userId = "";

  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (userData.user) {
      userId = userData.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, bio, website, social_links, is_public, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();

      initial = {
        email: userData.user.email ?? "",
        fullName: profile?.full_name ?? "",
        username: profile?.username ?? "",
        bio: profile?.bio ?? "",
        website: profile?.website ?? "",
        socialLinks: (profile?.social_links as Record<string, string> | null) ?? {},
        isPublic: Boolean(profile?.is_public),
        avatarUrl: profile?.avatar_url ?? "",
      };
    }
  }

  return <ProfileForm userId={userId} initial={initial} />;
}
