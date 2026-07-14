"use server";

import { redirect } from "next/navigation";
import { hasSupabasePublicEnv } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

/**
 * Sign out of the current device only, then return to the sign-in screen.
 * Used by the sidebar and settings.
 */
export async function signOutAction() {
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/auth");
}

/** Sign out of every device (invalidates all sessions for this user). */
export async function signOutAllDevicesAction() {
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  }
  redirect("/auth");
}
