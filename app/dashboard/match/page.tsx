import { redirect } from "next/navigation";
import { getCurrentCompany } from "../../../lib/companies/server";
import MatchClient from "./MatchClient";

// The company row is read per request, so a profile edit shows up in the
// context card immediately rather than after a rebuild.
export const dynamic = "force-dynamic";

export default async function MatchPage() {
  const company = await getCurrentCompany();
  // Every match is qualified against a real profile, so there is nothing to ask
  // for until one exists — registration comes first.
  if (!company) redirect("/onboarding");

  return <MatchClient company={company} />;
}
