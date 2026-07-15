"use client";

import { createClient } from "../supabase/client";

export interface ImportJob {
  id: string;
  platform: string;
  status: "queued" | "running" | "completed" | "failed";
  totalItems: number;
  importedItems: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface ImportJobRow {
  id: string;
  platform: string;
  status: ImportJob["status"];
  total_items: number;
  imported_items: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export async function getRecentImportJobs(limit = 5): Promise<ImportJob[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("id, platform, status, total_items, imported_items, error_message, started_at, completed_at")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ImportJobRow[]).map((row) => ({
    id: row.id,
    platform: row.platform,
    status: row.status,
    totalItems: row.total_items,
    importedItems: row.imported_items,
    error: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}
