"use client";

import { Briefcase, Building2, Settings, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { label: "Home", href: "/dashboard", icon: Building2, exact: true },
  { label: "Match", href: "/dashboard/match", icon: Target },
  { label: "Company", href: "/dashboard/company", icon: Briefcase },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardNav({ variant = "sidebar" }: { variant?: "sidebar" | "tabbar" }) {
  const pathname = usePathname();
  // Settings is reachable from the avatar menu on phones, so the tab bar keeps
  // only the three product destinations and never crowds a phone width.
  const items = variant === "tabbar" ? NAV_ITEMS.filter((item) => item.label !== "Settings") : NAV_ITEMS;

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
