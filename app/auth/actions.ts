"use server";

import { redirect } from "next/navigation";
import { hasSupabasePublicEnv } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

/**
 * End the current session server-side (clears the Supabase auth cookies) and
 * return to the sign-in screen. Used by the sidebar and settings.
 */
export async function signOutAction() {
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/auth");
}
