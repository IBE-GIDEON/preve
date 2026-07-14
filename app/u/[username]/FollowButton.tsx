"use client";

import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  followUser,
  getFollowState,
  unfollowUser,
  type FollowState,
} from "../../../lib/community/client";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowers: number;
}

export default function FollowButton({ targetUserId, initialFollowers }: FollowButtonProps) {
  const [state, setState] = useState<FollowState | null>(null);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFollowState(targetUserId).then(setState).catch(() => setState({ signedIn: false, isSelf: false, isFollowing: false }));
  }, [targetUserId]);

  async function toggle() {
    if (!state || busy) return;
    const next = !state.isFollowing;
    setBusy(true);
    setState({ ...state, isFollowing: next });
    setFollowers((count) => count + (next ? 1 : -1));
    try {
      if (next) await followUser(targetUserId);
      else await unfollowUser(targetUserId);
    } catch {
      setState({ ...state, isFollowing: !next });
      setFollowers((count) => count + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  // Follower count stays in sync with optimistic toggles.
  const countLabel = `${followers.toLocaleString()} ${followers === 1 ? "follower" : "followers"}`;

  if (!state) {
    return <span className="settings-muted">{countLabel}</span>;
  }

  if (state.isSelf) {
    return (
      <div className="profile-public-actions">
        <span className="settings-muted">{countLabel}</span>
        <Link href="/dashboard/settings/profile" className="settings-ghost-btn">Edit profile</Link>
      </div>
    );
  }

  if (!state.signedIn) {
    return (
      <div className="profile-public-actions">
        <span className="settings-muted">{countLabel}</span>
        <Link href="/auth" className="settings-save-btn" style={{ height: "38px", display: "inline-flex", alignItems: "center", padding: "0 1.1rem" }}>
          <UserPlus size={15} style={{ marginRight: "0.35rem" }} /> Sign in to follow
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-public-actions">
      <span className="settings-muted">{countLabel}</span>
      <button
        onClick={toggle}
        disabled={busy}
        className={state.isFollowing ? "settings-ghost-btn" : "settings-save-btn"}
        style={state.isFollowing ? undefined : { height: "38px", padding: "0 1.1rem" }}
      >
        {state.isFollowing ? <><Check size={15} /> Following</> : <><UserPlus size={15} /> Follow</>}
      </button>
    </div>
  );
}
