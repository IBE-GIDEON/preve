import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import ThemeToggle from "../../components/ThemeToggle";
import DashboardNav from "../../components/DashboardNav";
import SidebarUser from "../../components/SidebarUser";
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

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="logo" style={{ textDecoration: "none" }}>
          preve
        </Link>

        <DashboardNav />

        <div className="sidebar-footer">
          {user?.email && <SidebarUser email={user.email} name={fullName} />}
          <ThemeToggle />
        </div>
      </aside>

      {children}
    </div>
  );
}
