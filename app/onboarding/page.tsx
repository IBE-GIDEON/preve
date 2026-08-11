import { redirect } from "next/navigation";
import { getCurrentCompany } from "../../lib/companies/server";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";
import CompanyRegistration from "./CompanyRegistration";

// Onboarding reads the session, so it can never be prerendered.
export const dynamic = "force-dynamic";

/**
 * Registering a company page IS onboarding now: it's the first thing a new user
 * sees, and the object every match is qualified against.
 */
export default async function OnboardingPage() {
  // Local preview hands back a stand-in company so the dashboard is reachable
  // without Supabase; honouring it here would make registration the one screen
  // you could never look at in that mode, so the redirect is skipped instead.
  const company = await getCurrentCompany();
  if (company && !isLocalPreviewAuthBypassEnabled()) redirect("/dashboard");

  // The logo upload writes to company-logos/<user id>/, so the client needs the
  // id. Empty means no storage target, and the flow degrades to no logo.
  let userId = "";
  if (hasSupabasePublicEnv()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? "";
    } catch {
      userId = "";
    }
  }

  return <CompanyRegistration userId={userId} />;
}
