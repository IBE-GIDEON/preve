import { redirect } from "next/navigation";
import { getCurrentCompany } from "../../../lib/companies/server";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import { createClient } from "../../../lib/supabase/server";
import CompanyProfileForm from "./CompanyProfileForm";

// Always read the live row: the editor's inputs are seeded from it, and a stale
// cache would quietly hand the user an old slug to save over a new one.
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const company = await getCurrentCompany();
  // Nothing to edit until the page exists, and creating it is the onboarding flow.
  if (!company) redirect("/onboarding");

  // Logos are written to company-logos/<user id>/…, which is exactly what the
  // storage policy checks — so the client needs the id from the server.
  let userId = "";
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? "";
  }

  return <CompanyProfileForm userId={userId} company={company} />;
}
