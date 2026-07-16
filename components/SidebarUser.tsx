"use client";

import { ChevronsUpDown, Heart, LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "../app/auth/actions";
import { getSupportUrl } from "../lib/support";
import { getDisplayName, getInitials } from "../lib/user";

interface SidebarUserProps {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

/** Standard account menu pinned to the sidebar footer: avatar -> dropdown. */
export default function SidebarUser({ email, name, avatarUrl }: SidebarUserProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const displayName = getDisplayName(name, email);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="sidebar-user-wrap" ref={wrapRef}>
      {open && (
        <div className="sidebar-user-menu" role="menu">
          <Link
            href="/dashboard/settings/profile"
            className="sidebar-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <UserIcon size={15} /> Profile
          </Link>
          <Link
            href="/dashboard/settings"
            className="sidebar-user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings size={15} /> Settings
          </Link>
          {getSupportUrl() && (
            <a
              href={getSupportUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-user-menu-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Heart size={15} /> Support preve
            </a>
          )}
          <form action={signOutAction}>
            <button type="submit" className="sidebar-user-menu-item danger" role="menuitem">
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="sidebar-user"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="sidebar-user-avatar sidebar-user-avatar-img" />
        ) : (
          <span className="sidebar-user-avatar" aria-hidden="true">
            {getInitials(name, email)}
          </span>
        )}
        <span className="sidebar-user-meta">
          <span className="sidebar-user-name">{displayName}</span>
          <span className="sidebar-user-email">{email}</span>
        </span>
        <ChevronsUpDown size={15} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>
    </div>
  );
}
