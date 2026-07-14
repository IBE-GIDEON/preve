"use client";

import { createClient } from "../supabase/client";

export interface FollowState {
  signedIn: boolean;
  isSelf: boolean;
  isFollowing: boolean;
}

export async function getFollowState(targetUserId: string): Promise<FollowState> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { signedIn: false, isSelf: false, isFollowing: false };
  if (user.id === targetUserId) return { signedIn: true, isSelf: true, isFollowing: false };

  const { data: row } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  return { signedIn: true, isSelf: false, isFollowing: Boolean(row) };
}

export async function followUser(targetUserId: string) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in to follow.");
  const { error } = await supabase
    .from("follows")
    .upsert({ follower_id: data.user.id, following_id: targetUserId }, { onConflict: "follower_id,following_id" });
  if (error) throw new Error(error.message);
}

export async function unfollowUser(targetUserId: string) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in to follow.");
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", data.user.id)
    .eq("following_id", targetUserId);
  if (error) throw new Error(error.message);
}
