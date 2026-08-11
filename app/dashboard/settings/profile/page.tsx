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
        .select("full_name, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();

      initial = {
        email: userData.user.email ?? "",
        fullName:
          (profile?.full_name as string | null) ??
          (userData.user.user_metadata?.full_name as string | undefined) ??
          "",
        avatarUrl:
          (profile?.avatar_url as string | null) ??
          (userData.user.user_metadata?.avatar_url as string | undefined) ??
          "",
      };
    }
  }

  return <ProfileForm userId={userId} initial={initial} />;
}
