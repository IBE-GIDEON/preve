// Server-side archive persistence shared by the Reddit import routes.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedItem } from "../reddit-shared";

/** Batch-upsert normalized items into archive_items. Returns rows written. */
export async function upsertArchiveItems(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
  items: NormalizedItem[],
): Promise<number> {
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
