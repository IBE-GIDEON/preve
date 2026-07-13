export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  const url =
    rawUrl && !/^https?:\/\//i.test(rawUrl) && rawUrl.endsWith(".supabase.co")
      ? `https://${rawUrl}`
      : rawUrl;

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function hasSupabasePublicEnv() {
  return Boolean(getSupabasePublicEnv());
}

export function isLocalPreviewAuthBypassEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.PREVE_DEV_BYPASS_AUTH === "true" || !hasSupabasePublicEnv();
}
