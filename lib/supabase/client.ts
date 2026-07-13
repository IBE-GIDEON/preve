"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv, type SupabasePublicEnv } from "./env";

export function createClient(publicEnv?: SupabasePublicEnv | null) {
  const env = publicEnv ?? getSupabasePublicEnv();
  if (!env) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return createBrowserClient(env.url, env.publishableKey);
}
