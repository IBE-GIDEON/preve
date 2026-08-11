// Server-side reads for the company object — the thing every matching surface
// starts from. This lives apart from the server actions because a "use server"
// file may only export async functions, and the column list, the row helpers,
// and the missing-table check are all shared with those actions.

import { mapCompanyRow, type CompanyProfile } from "../company";
import { hasSupabasePublicEnv, isLocalPreviewAuthBypassEnabled } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * Stand-in company for local preview, where there is no Supabase session to own
 * a real row. Without it every dashboard surface would bounce to /onboarding and
 * the no-Supabase preview mode could not reach the product at all. Never used in
 * production — isLocalPreviewAuthBypassEnabled() is hard-false there.
 */
export const PREVIEW_COMPANY: CompanyProfile = {
  id: "preview-company",
  slug: "northwind-labs",
  name: "Northwind Labs",
  website: "https://northwind.example",
  tagline: "Payments infrastructure for African marketplaces",
  description: "Northwind Labs builds payment rails for marketplaces operating across West Africa.",
  industry: "Fintech",
  size: "51-200 employees",
  orgType: "Privately held",
  headquarters: "Lagos, Nigeria",
  markets: ["Nigeria", "Ghana", "Kenya"],
  specialties: ["Payments", "Fraud prevention", "Marketplace payouts"],
  foundedYear: 2021,
  logoUrl: null,
};

/** A saved match run, flattened for the UI. */
export interface MatchRequestRecord {
  id: string;
  need: string;
  createdAt: string;
  qualification: { summary: string; signals: string[] };
  providers: { name: string; match: number; why: string; considerations: string }[];
}

// Explicit columns rather than "*": owner_id would otherwise ride along into
// client components the moment a page hands a profile down as props.
const COMPANY_COLUMNS =
  "id, slug, name, website, tagline, description, industry, size, org_type, headquarters, markets, specialties, founded_year, logo_url";

/**
 * The 007 migration has not always been applied to the live project, so an
 * absent table is an expected state rather than a failure — callers degrade to
 * "no company yet" instead of blowing up a server render.
 */
export function isMissingTable(error: { code?: string | null } | null | undefined) {
  return error?.code === "42P01";
}

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// jsonb comes back as whatever was written, so re-shape it on read: an older
// row (or a model that drifted) must not crash a history list.
function toQualification(value: unknown): MatchRequestRecord["qualification"] {
  const root = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    summary: str(root.summary),
    signals: (Array.isArray(root.signals) ? root.signals : []).map(str).filter(Boolean).slice(0, 5),
  };
}

function toProviders(value: unknown): MatchRequestRecord["providers"] {
  return (Array.isArray(value) ? value : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => ({
      name: str(p.name),
      // Clamped on read as well as on parse, so the score bar can trust it.
      match: Math.max(0, Math.min(99, Math.round(Number(p.match)) || 0)),
      why: str(p.why),
      considerations: str(p.considerations),
    }))
    .filter((p) => p.name);
}

/**
 * The signed-in user's company. Returns null — never throws — when there is no
 * session, no Supabase env (local preview bypass), or no company yet, because
 * every dashboard page calls this during render.
 */
export async function getCurrentCompany(): Promise<CompanyProfile | null> {
  if (isLocalPreviewAuthBypassEnabled()) return PREVIEW_COMPANY;
  if (!hasSupabasePublicEnv()) return null;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    // Newest first with limit(1) rather than maybeSingle(): a user who somehow
    // owns two pages should see their latest, not an error.
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return mapCompanyRow(data[0] as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Load one company by id. Same never-throw contract as getCurrentCompany. */
export async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  if (!id || !hasSupabasePublicEnv()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("id", id)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return mapCompanyRow(data[0] as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** A company's saved match runs, newest first. Empty list on any failure. */
export async function listMatchRequests(companyId: string, limit = 10): Promise<MatchRequestRecord[]> {
  if (!companyId || !hasSupabasePublicEnv()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("match_requests")
      .select("id, need, created_at, qualification, providers")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(50, limit)));

    if (error || !data) return [];

    return (data as unknown as Record<string, unknown>[]).map((row) => ({
      id: String(row.id ?? ""),
      need: str(row.need),
      createdAt: String(row.created_at ?? ""),
      qualification: toQualification(row.qualification),
      providers: toProviders(row.providers),
    }));
  } catch {
    return [];
  }
}

/**
 * Persist a match run for later review. Best effort by design: the user already
 * has their answer on screen, so a write failure must never break the match.
 */
export async function saveMatchRequest(input: {
  companyId: string;
  need: string;
  qualification: unknown;
  providers: unknown;
}): Promise<void> {
  if (!input.companyId || !hasSupabasePublicEnv()) return;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    await supabase.from("match_requests").insert({
      company_id: input.companyId,
      user_id: user.id,
      need: input.need.trim(),
      qualification: input.qualification ?? {},
      providers: input.providers ?? [],
    });
  } catch {
    // Swallowed on purpose — see the doc comment.
  }
}
