// Server-side archive persistence shared by the Reddit import routes.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedItem } from "../reddit-shared";

// Per-user hard cap so a runaway/abusive import can't insert unbounded rows.
const MAX_ARCHIVE_ITEMS = 50_000;

/** Batch-upsert normalized items into archive_items. Returns rows written. */
export async function upsertArchiveItems(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
  items: NormalizedItem[],
): Promise<number> {
  if (items.length === 0) return 0;

  // Reject once the user is at/over the cap (over-counts updates as inserts,
  // which is the safe direction for a ceiling).
  const { count } = await supabase
    .from("archive_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) + items.length > MAX_ARCHIVE_ITEMS) {
    throw new Error(
      `Archive limit reached (${MAX_ARCHIVE_ITEMS.toLocaleString()} items). Delete some imported data before importing more.`,
    );
  }

  const rows = items.map((item) => ({
    user_id: userId,
    platform,
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
  return imported;
}
