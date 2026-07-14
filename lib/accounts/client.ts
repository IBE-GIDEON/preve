"use client";

import { createClient } from "../supabase/client";

export type AccountPlatform = "reddit" | "x" | "linkedin";
export type AccountStatus = "connected" | "disconnected" | "importing" | "error";

export interface ConnectedAccount {
  platform: AccountPlatform;
  status: AccountStatus;
  handle: string | null;
  lastSyncAt: string | null;
}

export type ConnectedAccountMap = Record<AccountPlatform, ConnectedAccount | null>;

interface AccountRow {
  platform: AccountPlatform;
  status: AccountStatus;
  platform_username: string | null;
  last_sync_at: string | null;
}

async function requireUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in.");
  return data.user.id;
}

export async function listConnectedAccounts(): Promise<ConnectedAccountMap> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("platform, status, platform_username, last_sync_at");
  if (error) throw new Error(error.message);

  const map: ConnectedAccountMap = { reddit: null, x: null, linkedin: null };
  for (const row of (data ?? []) as AccountRow[]) {
    map[row.platform] = {
      platform: row.platform,
      status: row.status,
      handle: row.platform_username,
      lastSyncAt: row.last_sync_at,
    };
  }
  return map;
}

export async function connectAccount(platform: AccountPlatform, handle: string) {
  const userId = await requireUserId();
  const supabase = createClient();
  const { error } = await supabase.from("connected_accounts").upsert(
    {
      user_id: userId,
      platform,
      platform_username: handle.trim() || null,
      status: "connected",
      last_sync_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" },
  );
  if (error) throw new Error(error.message);
}

export async function disconnectAccount(platform: AccountPlatform) {
  const userId = await requireUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("connected_accounts")
    .update({ status: "disconnected" })
    .eq("user_id", userId)
    .eq("platform", platform);
  if (error) throw new Error(error.message);
}

export async function syncAccount(platform: AccountPlatform) {
  const userId = await requireUserId();
  const supabase = createClient();
  const { error } = await supabase
    .from("connected_accounts")
    .update({ status: "connected", last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("platform", platform);
  if (error) throw new Error(error.message);
}
