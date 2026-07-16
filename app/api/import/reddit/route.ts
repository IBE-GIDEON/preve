import { NextResponse } from "next/server";
import { upsertArchiveItems } from "../../../../lib/archive/server";
import {
  fetchRedditArchive,
  fetchRedditPublicArchive,
  hasRedditEnv,
  isValidRedditUsername,
  normalizeRedditUsername,
  refreshRedditToken,
  type NormalizedItem,
} from "../../../../lib/reddit";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const userId = userData.user.id;

  const body = (await request.json().catch(() => ({}))) as { username?: string };

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("platform_username, metadata")
    .eq("user_id", userId)
    .eq("platform", "reddit")
    .maybeSingle();

  const refreshToken = (account?.metadata as { refresh_token?: string } | null)?.refresh_token;
  const oauthUsername = account?.platform_username as string | undefined;

  // Two ways in: OAuth (connected account, needs server keys) or keyless —
  // Reddit serves any user's public history as JSON, no credentials required.
  const useOauth = Boolean(refreshToken && oauthUsername && hasRedditEnv());
  const publicUsername = normalizeRedditUsername(body.username ?? oauthUsername ?? "");
  if (!useOauth && !isValidRedditUsername(publicUsername)) {
    return NextResponse.json({ error: "Enter a valid Reddit username (like u/yourname)." }, { status: 400 });
  }

  if (useOauth) {
    await supabase
      .from("connected_accounts")
      .update({ status: "importing" })
      .eq("user_id", userId)
      .eq("platform", "reddit");
  } else {
    // Keyless connections still get an account row so sync status/last-sync
    // show up everywhere. Only runs when no OAuth tokens exist, so this never
    // clobbers stored credentials.
    const { error } = await supabase.from("connected_accounts").upsert(
      {
        user_id: userId,
        platform: "reddit",
        platform_username: publicUsername,
        status: "importing",
        metadata: { mode: "public" },
      },
      { onConflict: "user_id,platform" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: job } = await supabase
    .from("import_jobs")
    .insert({ user_id: userId, platform: "reddit", status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  try {
    let items: NormalizedItem[];
    if (useOauth) {
      const tokens = await refreshRedditToken(refreshToken!);
      items = await fetchRedditArchive(tokens.access_token, oauthUsername!, 3);
    } else {
      items = await fetchRedditPublicArchive(publicUsername, 3);
    }

    const imported = await upsertArchiveItems(supabase, userId, "reddit", items);

    const now = new Date().toISOString();
    if (job) {
      await supabase
        .from("import_jobs")
        .update({ status: "completed", total_items: items.length, imported_items: imported, completed_at: now })
        .eq("id", job.id);
    }
    await supabase
      .from("connected_accounts")
      .update({ status: "connected", last_sync_at: now })
      .eq("user_id", userId)
      .eq("platform", "reddit");

    return NextResponse.json({ imported, total: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    if (job) {
      await supabase
        .from("import_jobs")
        .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
    }
    await supabase.from("connected_accounts").update({ status: "error" }).eq("user_id", userId).eq("platform", "reddit");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
