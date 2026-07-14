import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

export function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Server-only Supabase admin client (service role). Required for privileged
 * operations like deleting an auth user. NEVER import this into client code —
 * the service role key bypasses Row Level Security.
 */
export function createAdminClient() {
  const env = getSupabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env || !serviceKey) return null;

  return createServiceClient(env.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
