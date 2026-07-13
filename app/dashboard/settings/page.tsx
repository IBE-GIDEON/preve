import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";
import SettingsView, { type SettingsAccount } from "./SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let account: SettingsAccount | null = null;

  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, created_at")
        .eq("id", data.user.id)
        .maybeSingle();

      account = {
        email: data.user.email ?? "",
        fullName:
          (profile?.full_name as string | null) ??
          (data.user.user_metadata?.full_name as string | undefined) ??
          "",
        memberSince: (profile?.created_at as string | null) ?? data.user.created_at ?? null,
      };
    }
  }

  return <SettingsView account={account} />;
}
