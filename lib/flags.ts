// Feature flags read on both client and server (NEXT_PUBLIC_ is inlined at
// build time).

// Reddit is hidden until API keys exist — self-serve app creation is walled
// and keyless import gets bot-blocked, so surfacing it only frustrates users.
// Set NEXT_PUBLIC_REDDIT_ENABLED=true in the environment once REDDIT_CLIENT_ID
// / REDDIT_CLIENT_SECRET are configured, and every Reddit surface returns.
export function isRedditEnabled(): boolean {
  return process.env.NEXT_PUBLIC_REDDIT_ENABLED === "true";
}
