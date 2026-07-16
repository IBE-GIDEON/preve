import { Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import ThemeToggle from "../../components/ThemeToggle";
import DashboardNav from "../../components/DashboardNav";
import SidebarUser from "../../components/SidebarUser";
import { getSupportUrl } from "../../lib/support";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let user: User | null = null;

  if (!isLocalPreviewAuthBypassEnabled()) {
    if (!hasSupabasePublicEnv()) {
      redirect("/auth?error=auth_not_configured&next=/dashboard");
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      redirect("/auth?next=/dashboard");
    }

    user = data.user;
  }

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <div className="dashboard-layout">
      {/* Desktop: fixed left sidebar */}
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
          preve
        </Link>

        <DashboardNav />

        {getSupportUrl() && (
          <a
            href={getSupportUrl()!}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-support-pill"
          >
            <Heart size={14} aria-hidden="true" /> Support preve
          </a>
        )}

        <div className="sidebar-footer">
          {user?.email && <SidebarUser email={user.email} name={fullName} avatarUrl={avatarUrl} />}
          <ThemeToggle />
        </div>
      </aside>

      {/* Phones: sticky top bar (logo · theme · account) + bottom tab bar */}
      <header className="dashboard-mobilebar">
        <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
          preve
        </Link>
        <div className="dashboard-mobilebar-actions">
          {getSupportUrl() && (
            <a
              href={getSupportUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className="mobilebar-support"
              aria-label="Support preve"
            >
              <Heart size={18} aria-hidden="true" />
            </a>
          )}
          <ThemeToggle />
          {user?.email && <SidebarUser email={user.email} name={fullName} avatarUrl={avatarUrl} />}
        </div>
      </header>

      {children}

      <nav className="dashboard-tabbar" aria-label="Primary">
        <DashboardNav variant="tabbar" />
      </nav>
    </div>
  );
}
