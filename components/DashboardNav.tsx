"use client";

import {
  Bookmark,
  DownloadCloud,
  Home,
  Link2,
  Search,
  Settings,
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
  { label: "Home", href: "/dashboard", icon: Home, exact: true },
  { label: "Search", href: "/dashboard/search", icon: Search },
  { label: "Imports", href: "/dashboard/imports", icon: DownloadCloud },
  { label: "Accounts", href: "/dashboard/accounts", icon: Link2 },
  { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map((item) => {
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
