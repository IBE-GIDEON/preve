import { NextResponse } from "next/server";
import { upsertArchiveItems } from "../../../../lib/archive/server";
import { parseFeed, parseFeedTitle, resolveFeedText } from "../../../../lib/rss";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const userId = userData.user.id;

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  let url = (body.url ?? "").trim();
  if (!url) {
    // Re-sync path → use the stored feed URL.
    const { data: account } = await supabase
      .from("connected_accounts")
      .select("platform_username")
      .eq("user_id", userId)
      .eq("platform", "rss")
      .maybeSingle();
    url = ((account?.platform_username as string | undefined) ?? "").trim();
  }
  if (!url) return NextResponse.json({ error: "Paste a blog or feed URL." }, { status: 400 });

  const { error: accountError } = await supabase.from("connected_accounts").upsert(
    { user_id: userId, platform: "rss", platform_username: url, status: "importing", metadata: { mode: "public" } },
    { onConflict: "user_id,platform" },
  );
  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 });

  const { data: job } = await supabase
    .from("import_jobs")
    .insert({ user_id: userId, platform: "rss", status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  try {
    const xml = await resolveFeedText(url);
    const items = parseFeed(xml);
    const title = parseFeedTitle(xml);
    const imported = await upsertArchiveItems(supabase, userId, "rss", items);

    const now = new Date().toISOString();
    if (job) {
      await supabase
        .from("import_jobs")
        .update({ status: "completed", total_items: items.length, imported_items: imported, completed_at: now })
        .eq("id", job.id);
    }
    await supabase
      .from("connected_accounts")
      .update({
        status: "connected",
        last_sync_at: now,
        metadata: { mode: "public", title: title ?? null },
      })
      .eq("user_id", userId)
      .eq("platform", "rss");

    return NextResponse.json({ imported, total: items.length, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    if (job) {
      await supabase
        .from("import_jobs")
        .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
    }
    await supabase
      .from("connected_accounts")
      .update({ status: "error" })
      .eq("user_id", userId)
      .eq("platform", "rss");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
