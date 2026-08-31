"use client";

import {
  Bookmark,
  DownloadCloud,
  FolderOpen,
  Link2,
  PenLine,
  Search,
  Settings,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { countStoredPosts, PREVE_POSTS_EVENT } from "../lib/preve-posts";

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { label: "Search", href: "/dashboard", icon: Search, exact: true },
  { label: "Posts", href: "/dashboard/posts", icon: WandSparkles },
  { label: "Compose", href: "/dashboard/compose", icon: PenLine },
  { label: "Collections", href: "/dashboard/collections", icon: FolderOpen },
  { label: "Imports", href: "/dashboard/imports", icon: DownloadCloud },
  { label: "Accounts", href: "/dashboard/accounts", icon: Link2 },
  { label: "Library", href: "/dashboard/saved", icon: Bookmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardNav({ variant = "sidebar" }: { variant?: "sidebar" | "tabbar" }) {
  const pathname = usePathname();

  // "Cart"-style badge: how many preve Posts ideas are waiting. Kept in sync via
  // a custom event (same tab) and the storage event (other tabs).
  const [waitingPosts, setWaitingPosts] = useState(0);
  useEffect(() => {
    const update = () => setWaitingPosts(countStoredPosts());
    update();
    window.addEventListener(PREVE_POSTS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(PREVE_POSTS_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  // The mobile tab bar keeps 5 core destinations so it never crowds a phone
  // width. Posts (AI ideas) is the primary create surface on mobile, so Compose
  // rides along inside it there; Settings lives in the avatar menu, Library on
  // desktop.
  const TABBAR_HIDDEN = new Set(["Settings", "Library", "Compose"]);
  const items = variant === "tabbar" ? NAV_ITEMS.filter((item) => !TABBAR_HIDDEN.has(item.label)) : NAV_ITEMS;

  return (
    <nav className={variant === "tabbar" ? "tabbar-nav" : "sidebar-nav"}>
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;

        const badge = item.href === "/dashboard/posts" && waitingPosts > 0 ? waitingPosts : null;

        return (
          <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
            <Icon className="nav-link-icon" aria-hidden="true" strokeWidth={2} />
            {item.label}
            {badge !== null && (
              <span className="nav-badge" aria-label={`${badge} posts waiting`}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
