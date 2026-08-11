// The company profile is the heart of preve: it's what the matching engine
// qualifies a need against. Shared by the registration flow, the settings
// editor, and the match request builder — so validation lives in one place.

export interface CompanyProfile {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  orgType: string | null;
  headquarters: string | null;
  markets: string[];
  specialties: string[];
  foundedYear: number | null;
  logoUrl: string | null;
}

/** What the registration flow collects. Mirrors LinkedIn's page-creation form. */
export interface CompanyRegistrationInput {
  name: string;
  slug: string;
  website: string;
  industry: string;
  size: string;
  orgType: string;
  tagline: string;
  logoUrl: string;
  verifiedRepresentative: boolean;
}

/** The "complete your page" fields, edited after the page exists. */
export interface CompanyDetailsInput {
  description: string;
  headquarters: string;
  markets: string[];
  specialties: string[];
  foundedYear: string;
}

// LinkedIn's employee bands, verbatim — buyers recognize them and they map
// cleanly onto how providers segment their own customers.
export const COMPANY_SIZES = [
  "0-1 employees",
  "2-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1,000 employees",
  "1,001-5,000 employees",
  "5,001-10,000 employees",
  "10,001+ employees",
] as const;

export const ORG_TYPES = [
  "Public company",
  "Privately held",
  "Self-employed",
  "Government agency",
  "Nonprofit",
  "Sole proprietorship",
  "Partnership",
] as const;

export const INDUSTRIES = [
  "Accounting",
  "Advertising & Marketing",
  "Aerospace",
  "Agriculture",
  "Airlines & Aviation",
  "Architecture & Planning",
  "Automotive",
  "Banking",
  "Biotechnology",
  "Broadcast Media",
  "Chemicals",
  "Civil Engineering",
  "Computer & Network Security",
  "Computer Games",
  "Computer Hardware",
  "Computer Software",
  "Construction",
  "Consumer Electronics",
  "Consumer Goods",
  "Consumer Services",
  "Defense & Space",
  "Design",
  "E-Learning",
  "Education",
  "Electrical & Electronic Manufacturing",
  "Energy & Utilities",
  "Entertainment",
  "Environmental Services",
  "Events Services",
  "Facilities Services",
  "Farming",
  "Financial Services",
  "Fintech",
  "Food & Beverages",
  "Government Administration",
  "Graphic Design",
  "Health, Wellness & Fitness",
  "Higher Education",
  "Hospital & Health Care",
  "Hospitality",
  "Human Resources",
  "Import & Export",
  "Industrial Automation",
  "Information Services",
  "Information Technology & Services",
  "Insurance",
  "International Trade & Development",
  "Internet",
  "Investment Banking",
  "Investment Management",
  "Legal Services",
  "Leisure, Travel & Tourism",
  "Logistics & Supply Chain",
  "Machinery",
  "Management Consulting",
  "Manufacturing",
  "Maritime",
  "Marketing & Advertising",
  "Mechanical or Industrial Engineering",
  "Media Production",
  "Medical Devices",
  "Mining & Metals",
  "Nonprofit Organization Management",
  "Oil & Energy",
  "Online Media",
  "Outsourcing/Offshoring",
  "Packaging & Containers",
  "Pharmaceuticals",
  "Professional Training & Coaching",
  "Public Relations & Communications",
  "Real Estate",
  "Renewables & Environment",
  "Research",
  "Restaurants",
  "Retail",
  "Security & Investigations",
  "Semiconductors",
  "Staffing & Recruiting",
  "Telecommunications",
  "Textiles",
  "Transportation & Trucking",
  "Utilities",
  "Venture Capital & Private Equity",
  "Warehousing",
  "Wholesale",
  "Writing & Editing",
] as const;

export const TAGLINE_MAX = 120;
export const DESCRIPTION_MAX = 2000;
export const SLUG_MIN = 3;
export const SLUG_MAX = 100;
export const NAME_MAX = 100;

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Turn a company name into a candidate URL slug ("Acme, Inc." -> "acme-inc"). */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

export function validateName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter your organization's name.";
  if (name.length > NAME_MAX) return `At most ${NAME_MAX} characters.`;
  return undefined;
}

export function validateSlug(value: string): string | undefined {
  const slug = value.trim().toLowerCase();
  if (!slug) return "Choose a public URL.";
  if (slug.length < SLUG_MIN) return `At least ${SLUG_MIN} characters.`;
  if (slug.length > SLUG_MAX) return `At most ${SLUG_MAX} characters.`;
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers, and hyphens.";
  return undefined;
}

/** Optional URL field. Accepts a bare domain and assumes https. */
export function validateWebsite(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!parsed.hostname.includes(".")) return "Enter a valid website URL.";
    return undefined;
  } catch {
    return "Enter a valid website URL.";
  }
}

/** Normalize a website for storage, adding the scheme the user left off. */
export function normalizeWebsite(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/**
 * A logo URL must point at our own storage bucket. The upload happens in the
 * browser and only the resulting URL is posted back, so without this a crafted
 * call could park any third-party URL in the row — which then loads as an
 * <img src> on the dashboard and the match page. Empty clears the logo.
 */
export function validateLogoUrl(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Nothing to compare against in local preview — the upload no-ops there too.
  if (!base) return undefined;

  try {
    const parsed = new URL(raw);
    if (parsed.origin !== new URL(base).origin) return "That logo URL isn't allowed.";
    if (!parsed.pathname.includes("/storage/v1/object/public/company-logos/")) {
      return "That logo URL isn't allowed.";
    }
    return undefined;
  } catch {
    return "That logo URL isn't allowed.";
  }
}

export function validateTagline(value: string): string | undefined {
  if (value.trim().length > TAGLINE_MAX) return `Keep your tagline under ${TAGLINE_MAX} characters.`;
  return undefined;
}

export function validateDescription(value: string): string | undefined {
  if (value.trim().length > DESCRIPTION_MAX) return `Keep your description under ${DESCRIPTION_MAX} characters.`;
  return undefined;
}

export function validateFoundedYear(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  if (!/^\d{4}$/.test(raw)) return "Enter a 4-digit year.";
  const year = Number(raw);
  // Upper bound is derived at call time so this never goes stale.
  if (year < 1800 || year > new Date().getFullYear()) return "Enter a realistic founding year.";
  return undefined;
}

/** Split a comma-separated input into a clean, de-duplicated list. */
export function parseList(value: string, max = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(",")) {
    const item = part.trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Render a company profile as the brief the matching engine reads. Keeping this
 * next to the profile shape means a new field reaches the AI by being added here.
 */
export function buildCompanyBrief(company: CompanyProfile, need: string): string {
  const lines = [
    `Company: ${company.name}`,
    company.tagline && `Tagline: ${company.tagline}`,
    company.industry && `Industry: ${company.industry}`,
    company.size && `Employees: ${company.size}`,
    company.orgType && `Organization type: ${company.orgType}`,
    company.headquarters && `Headquarters: ${company.headquarters}`,
    company.markets.length > 0 && `Markets: ${company.markets.join(", ")}`,
    company.specialties.length > 0 && `Specialties: ${company.specialties.join(", ")}`,
    company.foundedYear && `Founded: ${company.foundedYear}`,
    company.website && `Website: ${company.website}`,
    company.description && `About: ${company.description}`,
    `Need: ${need.trim()}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Map a DB row (snake_case) onto the app-facing profile shape. */
export function mapCompanyRow(row: Record<string, unknown>): CompanyProfile {
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);

  return {
    id: String(row.id ?? ""),
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    website: text(row.website),
    tagline: text(row.tagline),
    description: text(row.description),
    industry: text(row.industry),
    size: text(row.size),
    orgType: text(row.org_type),
    headquarters: text(row.headquarters),
    markets: list(row.markets),
    specialties: list(row.specialties),
    foundedYear: typeof row.founded_year === "number" ? row.founded_year : null,
    logoUrl: text(row.logo_url),
  };
}
