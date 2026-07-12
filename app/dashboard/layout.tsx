import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "../../components/ThemeToggle";
import DashboardNav from "../../components/DashboardNav";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (isLocalPreviewAuthBypassEnabled()) {
    return (
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
            preve
          </Link>

          <DashboardNav />

          <div className="sidebar-footer">
            <ThemeToggle />
          </div>
        </aside>

        {children}
      </div>
    );
  }

  if (!hasSupabasePublicEnv()) {
    redirect("/auth?error=auth_not_configured&next=/dashboard");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth?next=/dashboard");
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
          preve
        </Link>

        <DashboardNav />

        <div className="sidebar-footer">
          <ThemeToggle />
        </div>
      </aside>

      {children}
    </div>
  );
}
