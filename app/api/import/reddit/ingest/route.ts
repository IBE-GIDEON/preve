import { NextResponse } from "next/server";
import { upsertArchiveItems } from "../../../../../lib/archive/server";
import {
  isValidRedditUsername,
  normalizeRedditUsername,
  type NormalizedItem,
} from "../../../../../lib/reddit-shared";
import { createClient } from "../../../../../lib/supabase/server";

export const maxDuration = 30;

// 3 pages × 100 items × 2 types = 600 from our fetcher; headroom on top.
const MAX_ITEMS = 1200;

// Browser-supplied data is untrusted — rebuild each item field by field.
function sanitizeItem(raw: unknown): NormalizedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.platform_item_id === "string" ? r.platform_item_id.trim() : "";
  if (!/^[a-z0-9_]{1,40}$/i.test(id)) return null;

  const kind = r.kind === "comment" ? ("comment" as const) : r.kind === "post" ? ("post" as const) : null;
  if (!kind) return null;

  const body = typeof r.body === "string" ? r.body.slice(0, 40000) : "";
  const sourceTitle = typeof r.source_title === "string" ? r.source_title.slice(0, 500) : null;

  let url: string | null = null;
  if (typeof r.url === "string" && /^https?:\/\//i.test(r.url)) url = r.url.slice(0, 2000);

  const topics = Array.isArray(r.topics)
    ? r.topics.filter((t): t is string => typeof t === "string").slice(0, 20).map((t) => t.slice(0, 100))
    : [];

  const engagement = (r.engagement ?? {}) as Record<string, unknown>;
  const likes = Number(engagement.likes) || 0;
  const comments = Number(engagement.comments) || 0;

  const parsedDate = new Date(typeof r.published_at === "string" ? r.published_at : NaN);
  const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

  return {
    platform_item_id: id,
    kind,
    source_title: sourceTitle,
    body,
    url,
    topics,
    engagement: { likes, comments },
    published_at: publishedAt,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const userId = userData.user.id;

  const body = (await request.json().catch(() => ({}))) as { username?: string; items?: unknown[] };

  const username = normalizeRedditUsername(body.username ?? "");
  if (!isValidRedditUsername(username)) {
    return NextResponse.json({ error: "Enter a valid Reddit username (like u/yourname)." }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: "Invalid import payload." }, { status: 400 });
  }

  const items = body.items.map(sanitizeItem).filter((item): item is NormalizedItem => item !== null);

  // Record the connection — but never clobber stored OAuth tokens.
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("metadata")
    .eq("user_id", userId)
    .eq("platform", "reddit")
    .maybeSingle();
  const hasTokens = Boolean((account?.metadata as { refresh_token?: string } | null)?.refresh_token);
  if (!hasTokens) {
    const { error } = await supabase.from("connected_accounts").upsert(
      {
        user_id: userId,
        platform: "reddit",
        platform_username: username,
        status: "connected",
        metadata: { mode: "public" },
      },
      { onConflict: "user_id,platform" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  try {
    const imported = await upsertArchiveItems(supabase, userId, "reddit", items);

    await supabase.from("import_jobs").insert({
      user_id: userId,
      platform: "reddit",
      status: "completed",
      total_items: items.length,
      imported_items: imported,
      started_at: now,
      completed_at: new Date().toISOString(),
    });
    await supabase
      .from("connected_accounts")
      .update({ status: "connected", last_sync_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("platform", "reddit");

    return NextResponse.json({ imported, total: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    await supabase.from("import_jobs").insert({
      user_id: userId,
      platform: "reddit",
      status: "failed",
      error_message: message,
      started_at: now,
      completed_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
