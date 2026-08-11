"use server";

import { revalidatePath } from "next/cache";
import { isMissingTable } from "../../lib/companies/server";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  ORG_TYPES,
  normalizeWebsite,
  parseList,
  validateDescription,
  validateFoundedYear,
  validateLogoUrl,
  validateName,
  validateSlug,
  validateTagline,
  validateWebsite,
  type CompanyDetailsInput,
  type CompanyRegistrationInput,
} from "../../lib/company";
import { hasSupabasePublicEnv } from "../../lib/supabase/env";
import { createClient } from "../../lib/supabase/server";

// A server action is a public endpoint: anything the client sends can be
// missing or the wrong type, whatever the TypeScript signature promises.
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isMember = (options: readonly string[], value: string) => options.includes(value);

const MIGRATION_MISSING = "Company pages aren't available yet — the companies table is missing.";
const NOT_SIGNED_IN = "You're not signed in.";

/**
 * Live availability check for the public URL, as the user types it.
 * `excludeCompanyId` lets the settings editor re-check its own slug without
 * being told it's taken by itself.
 */
export async function checkCompanySlug(
  slug: string,
  excludeCompanyId?: string,
): Promise<{ available: boolean; reason?: string }> {
  const candidate = text(slug).toLowerCase();
  const invalid = validateSlug(candidate);
  if (invalid) return { available: false, reason: invalid };
  if (!hasSupabasePublicEnv()) return { available: true };

  try {
    const supabase = await createClient();
    // Asked through a security-definer function on purpose: RLS hides other
    // owners' rows, so querying the table directly would report every taken
    // slug as available and only fail at insert time.
    const { data, error } = await supabase.rpc("company_slug_available", {
      candidate,
      exclude_id: excludeCompanyId ?? null,
    });

    // Missing table or missing function (migration 007 not applied yet) — let
    // the unique index be the backstop rather than blocking the whole form.
    if (error) return { available: true };
    if (data === false) return { available: false, reason: "That URL is taken." };
    return { available: true };
  } catch {
    return { available: true };
  }
}

/** Shared field validation for the registration half of the form. */
function validateRegistration(input: CompanyRegistrationInput) {
  const fieldErrors: Record<string, string> = {};
  const name = text(input?.name);
  const slug = text(input?.slug).toLowerCase();
  const website = text(input?.website);
  const tagline = text(input?.tagline);
  const industry = text(input?.industry);
  const size = text(input?.size);
  const orgType = text(input?.orgType);
  const logoUrl = text(input?.logoUrl);

  const nameError = validateName(name);
  if (nameError) fieldErrors.name = nameError;
  const slugError = validateSlug(slug);
  if (slugError) fieldErrors.slug = slugError;
  const websiteError = validateWebsite(website);
  if (websiteError) fieldErrors.website = websiteError;
  const taglineError = validateTagline(tagline);
  if (taglineError) fieldErrors.tagline = taglineError;
  const logoError = validateLogoUrl(logoUrl);
  if (logoError) fieldErrors.logoUrl = logoError;

  // The dropdowns are closed sets — a value outside them would poison the
  // company brief the matching engine reads.
  if (!industry) fieldErrors.industry = "Choose an industry.";
  else if (!isMember(INDUSTRIES, industry)) fieldErrors.industry = "Choose an industry from the list.";

  if (!size) fieldErrors.size = "Choose an organization size.";
  else if (!isMember(COMPANY_SIZES, size)) fieldErrors.size = "Choose a size from the list.";

  if (!orgType) fieldErrors.orgType = "Choose an organization type.";
  else if (!isMember(ORG_TYPES, orgType)) fieldErrors.orgType = "Choose a type from the list.";

  return { fieldErrors, name, slug, website, tagline, industry, size, orgType, logoUrl };
}

/** Shared field validation for the "complete your page" half of the form. */
function validateDetails(input: CompanyDetailsInput) {
  const fieldErrors: Record<string, string> = {};
  const description = text(input?.description);
  const headquarters = text(input?.headquarters);
  const foundedYear = text(input?.foundedYear);

  const descriptionError = validateDescription(description);
  if (descriptionError) fieldErrors.description = descriptionError;
  const yearError = validateFoundedYear(foundedYear);
  if (yearError) fieldErrors.foundedYear = yearError;

  // Re-join before parsing so one comma-separated chip typed into a single
  // field splits the same way a proper list does.
  const list = (value: unknown) => parseList(Array.isArray(value) ? value.join(",") : text(value));

  return {
    fieldErrors,
    description,
    headquarters,
    markets: list(input?.markets),
    specialties: list(input?.specialties),
    foundedYear: foundedYear ? Number(foundedYear) : null,
  };
}

/** The authenticated user, or an error message shaped like an action result. */
async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

/**
 * Register the company page. Mirrors LinkedIn's flow: identity fields first,
 * an explicit representative affirmation, then the page exists.
 */
export async function createCompany(
  input: CompanyRegistrationInput,
): Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string>; slug?: string }> {
  const v = validateRegistration(input);
  const fieldErrors = v.fieldErrors;

  // LinkedIn requires this affirmation before a page can exist, and so do we —
  // it's the only thing standing between us and impersonated company pages.
  if (input?.verifiedRepresentative !== true) {
    fieldErrors.verifiedRepresentative = "Confirm you're authorized to create this page.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (!hasSupabasePublicEnv()) return { ok: true, slug: v.slug };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const taken = await checkCompanySlug(v.slug);
  if (!taken.available) return { ok: false, fieldErrors: { slug: taken.reason ?? "That URL is taken." } };

  const { error } = await supabase.from("companies").insert({
    owner_id: user.id,
    name: v.name,
    slug: v.slug,
    website: normalizeWebsite(v.website),
    tagline: v.tagline || null,
    industry: v.industry,
    size: v.size,
    org_type: v.orgType,
    logo_url: v.logoUrl || null,
    verified_representative: true,
  });

  if (error) {
    // The window between the check above and this insert is real, so the unique
    // index gets the last word — reported on the same field either way.
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "That URL is taken." } };
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_MISSING };
    return { ok: false, error: error.message };
  }

  // Note there's no `onboarded` flag to set: owning a company row is what being
  // onboarded means, and routing reads that row directly. A second copy of the
  // same fact on the user is what let the two disagree and loop.
  revalidatePath("/dashboard");
  return { ok: true, slug: v.slug };
}

/** The "complete your page" step: the fields the matching engine reads most. */
export async function updateCompanyDetails(
  companyId: string,
  input: CompanyDetailsInput,
): Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }> {
  const d = validateDetails(input);
  if (Object.keys(d.fieldErrors).length > 0) return { ok: false, fieldErrors: d.fieldErrors };
  if (!hasSupabasePublicEnv()) return { ok: true };
  if (!companyId) return { ok: false, error: "No company to update." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const { error } = await supabase
    .from("companies")
    .update({
      description: d.description || null,
      headquarters: d.headquarters || null,
      markets: d.markets,
      specialties: d.specialties,
      founded_year: d.foundedYear,
    })
    .eq("id", companyId)
    // RLS already scopes this, but owner_id keeps the intent readable and holds
    // if the policy is ever loosened for public reads.
    .eq("owner_id", user.id);

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_MISSING };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { ok: true };
}

/** Full edit from company settings: identity and details in one write. */
export async function updateCompanyProfile(
  companyId: string,
  input: CompanyRegistrationInput & CompanyDetailsInput,
): Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }> {
  const v = validateRegistration(input);
  const d = validateDetails(input);
  const fieldErrors = { ...v.fieldErrors, ...d.fieldErrors };

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (!hasSupabasePublicEnv()) return { ok: true };
  if (!companyId) return { ok: false, error: "No company to update." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  // Excluding this row is what makes saving an unchanged slug work.
  const taken = await checkCompanySlug(v.slug, companyId);
  if (!taken.available) return { ok: false, fieldErrors: { slug: taken.reason ?? "That URL is taken." } };

  const { error } = await supabase
    .from("companies")
    .update({
      name: v.name,
      slug: v.slug,
      website: normalizeWebsite(v.website),
      tagline: v.tagline || null,
      industry: v.industry,
      size: v.size,
      org_type: v.orgType,
      logo_url: v.logoUrl || null,
      description: d.description || null,
      headquarters: d.headquarters || null,
      markets: d.markets,
      specialties: d.specialties,
      founded_year: d.foundedYear,
    })
    .eq("id", companyId)
    .eq("owner_id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "That URL is taken." } };
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_MISSING };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { ok: true };
}

/** Persist a freshly uploaded logo URL (the upload itself happens client-side). */
export async function updateCompanyLogo(companyId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabasePublicEnv()) return { ok: true };
  if (!companyId) return { ok: false, error: "No company to update." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  // Only the URL comes back from the browser, so confirm it actually points at
  // our own bucket before it becomes an <img src> on every company surface.
  const logoUrl = text(url);
  const logoError = validateLogoUrl(logoUrl);
  if (logoError) return { ok: false, error: logoError };

  const { error } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl || null })
    .eq("id", companyId)
    .eq("owner_id", user.id);

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_MISSING };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/company");
  return { ok: true };
}
