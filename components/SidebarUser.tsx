"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "../app/auth/actions";
import { getDisplayName, getInitials } from "../lib/user";

interface SidebarUserProps {
  email: string;
  name?: string | null;
}

/** Signed-in identity + one-click sign out, pinned in the sidebar footer. */
export default function SidebarUser({ email, name }: SidebarUserProps) {
  const displayName = getDisplayName(name, email);

  return (
    <div className="sidebar-user">
      <span className="sidebar-user-avatar" aria-hidden="true">
        {getInitials(name, email)}
      </span>
      <span className="sidebar-user-meta">
        <span className="sidebar-user-name">{displayName}</span>
        <span className="sidebar-user-email">{email}</span>
      </span>
      <form action={signOutAction}>
        <button type="submit" className="sidebar-user-signout" aria-label="Sign out" title="Sign out">
          <LogOut size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
