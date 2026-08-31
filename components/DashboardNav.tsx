"use client";

import {
  Bookmark,
  DownloadCloud,
  FolderOpen,
  Link2,
  PenLine,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { label: "Search", href: "/dashboard", icon: Search, exact: true },
  { label: "Posts", href: "/dashboard/posts", icon: Sparkles },
  { label: "Compose", href: "/dashboard/compose", icon: PenLine },
  { label: "Collections", href: "/dashboard/collections", icon: FolderOpen },
  { label: "Imports", href: "/dashboard/imports", icon: DownloadCloud },
  { label: "Accounts", href: "/dashboard/accounts", icon: Link2 },
  { label: "Library", href: "/dashboard/saved", icon: Bookmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardNav({ variant = "sidebar" }: { variant?: "sidebar" | "tabbar" }) {
  const pathname = usePathname();
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

        return (
          <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
            <Icon className="nav-link-icon" aria-hidden="true" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
