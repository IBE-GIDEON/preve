import { NextResponse } from "next/server";
import { fetchRedditArchive, hasRedditEnv, refreshRedditToken } from "../../../../lib/reddit";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 60;

export async function POST() {
  if (!hasRedditEnv()) {
    return NextResponse.json({ error: "Reddit isn't configured on the server." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const userId = userData.user.id;

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("platform_username, metadata")
    .eq("user_id", userId)
    .eq("platform", "reddit")
    .maybeSingle();

  const refreshToken = (account?.metadata as { refresh_token?: string } | null)?.refresh_token;
  const username = account?.platform_username as string | undefined;
  if (!refreshToken || !username) {
    return NextResponse.json({ error: "Reddit isn't connected." }, { status: 400 });
  }

  await supabase.from("connected_accounts").update({ status: "importing" }).eq("user_id", userId).eq("platform", "reddit");
  const { data: job } = await supabase
    .from("import_jobs")
    .insert({ user_id: userId, platform: "reddit", status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  try {
    const tokens = await refreshRedditToken(refreshToken);
    const items = await fetchRedditArchive(tokens.access_token, username, 3);

    const rows = items.map((item) => ({
      user_id: userId,
      platform: "reddit",
      platform_item_id: item.platform_item_id,
      kind: item.kind,
      source_title: item.source_title,
      body: item.body,
      url: item.url,
      topics: item.topics,
      engagement: item.engagement,
      published_at: item.published_at,
    }));

    let imported = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from("archive_items")
        .upsert(batch, { onConflict: "user_id,platform,platform_item_id" });
      if (error) throw new Error(error.message);
      imported += batch.length;
    }

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
