import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Pencil, Target } from "lucide-react";
import type { CompanyProfile } from "../../lib/company";
import { getCurrentCompany, listMatchRequests } from "../../lib/companies/server";
import { getInitials } from "../../lib/user";

// The company row and its match history are read per request, so an edit shows
// up here immediately rather than after a rebuild.
export const dynamic = "force-dynamic";

/**
 * The fields buildCompanyBrief hands to the matching engine, ordered by how much
 * each one sharpens a match. The prompts below are simply the first few that are
 * still empty, so the highest-value gap is always the one we ask for first.
 */
const PROFILE_FIELDS: Array<{
  label: string;
  prompt: string;
  filled: (company: CompanyProfile) => boolean;
}> = [
  { label: "About", prompt: "Describe what your company does", filled: (c) => Boolean(c.description) },
  { label: "Specialties", prompt: "List what you specialize in", filled: (c) => c.specialties.length > 0 },
  { label: "Headquarters", prompt: "Add where you're based", filled: (c) => Boolean(c.headquarters) },
  { label: "Markets", prompt: "Name the markets you operate in", filled: (c) => c.markets.length > 0 },
  { label: "Tagline", prompt: "Write a one-line tagline", filled: (c) => Boolean(c.tagline) },
  { label: "Website", prompt: "Link your website", filled: (c) => Boolean(c.website) },
  { label: "Founded", prompt: "Add the year you were founded", filled: (c) => Boolean(c.foundedYear) },
  { label: "Logo", prompt: "Upload your logo", filled: (c) => Boolean(c.logoUrl) },
];

// Pinned to one locale: this renders on the server, where the machine's locale
// is an accident of the host rather than a choice anyone made.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

export default async function DashboardHome() {
  const company = await getCurrentCompany();
  // Everything here hangs off a registered company, and registering one *is*
  // onboarding now — so there is nothing to render until it exists.
  if (!company) redirect("/onboarding");

  const matches = await listMatchRequests(company.id, 5);

  const missing = PROFILE_FIELDS.filter((field) => !field.filled(company));
  const filledCount = PROFILE_FIELDS.length - missing.length;
  const completeness = Math.round((filledCount / PROFILE_FIELDS.length) * 100);
  const meta = [company.industry, company.size, company.headquarters].filter(Boolean).join(" · ");

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <div style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}>
          {/* Identity */}
          <section className="settings-section">
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt=""
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "14px",
                    objectFit: "cover",
                    border: "1px solid var(--input-border)",
                    background: "var(--background)",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "14px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--foreground)",
                    color: "var(--background)",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                  }}
                >
                  {getInitials(company.name, "")}
                </span>
              )}

              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, wordBreak: "break-word" }}>
                  {company.name}
                </h1>
                {company.tagline && (
                  <p style={{ margin: "0.35rem 0 0", opacity: 0.75, lineHeight: 1.5 }}>{company.tagline}</p>
                )}
                {meta && (
                  <p className="settings-muted" style={{ margin: "0.6rem 0 0" }}>
                    {meta}
                  </p>
                )}
                {/* Shown as a reserved handle, not a link: the slug is genuinely
                    claimed (unique index), but the public company page isn't
                    built yet, so presenting it as live would be a promise. */}
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.5, wordBreak: "break-all" }}>
                  preve.app/company/{company.slug} <span style={{ opacity: 0.8 }}>· reserved</span>
                </p>
              </div>

              <Link
                href="/dashboard/company"
                className="settings-ghost-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Pencil size={14} aria-hidden="true" /> Edit page
              </Link>
            </div>
          </section>

          {/* Completeness */}
          <section className="settings-section">
            <h2 className="settings-section-title">Page completeness</h2>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem" }}>
              <strong style={{ fontSize: "1.1rem" }}>{completeness}% complete</strong>
              <span className="settings-muted">
                {filledCount} of {PROFILE_FIELDS.length} fields
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: "6px",
                borderRadius: "999px",
                background: "var(--input-border)",
                margin: "0.6rem 0 0.9rem",
                overflow: "hidden",
              }}
            >
              <div style={{ width: `${completeness}%`, height: "100%", background: "#10B981" }} />
            </div>

            {missing.length > 0 ? (
              <>
                <p className="settings-muted" style={{ margin: "0 0 0.9rem" }}>
                  Every field on your page goes into the brief the AI reads before it ranks providers. A fuller page is
                  the difference between a generic shortlist and one built for your situation.
                </p>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {missing.slice(0, 3).map((field) => (
                    <Link
                      key={field.label}
                      href="/dashboard/company"
                      className="settings-row"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <span>
                        <span className="settings-row-label">{field.prompt}</span>
                        <span className="settings-muted" style={{ display: "block" }}>
                          {field.label}
                        </span>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.5 }} />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <p className="settings-muted" style={{ margin: 0 }}>
                Your page is complete — the matching engine has everything it needs to qualify a need against your real
                situation.
              </p>
            )}
          </section>

          {/* The one thing this dashboard exists to do. */}
          <Link
            href="/dashboard/match"
            className="landing-primary-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "12px",
              padding: "0.9rem 1.5rem",
              border: "none",
              textDecoration: "none",
              fontWeight: 600,
              marginBottom: "2rem",
            }}
          >
            <Target size={16} aria-hidden="true" /> Find providers
          </Link>

          {/* History */}
          <h2 className="settings-section-title">Recent matches</h2>
          {matches.length === 0 ? (
            <section className="settings-section">
              <p style={{ margin: "0 0 0.6rem", lineHeight: 1.6 }}>
                A match starts with one sentence about what you need — insurance, cloud, accounting, legal, recruiting,
                logistics. Preve qualifies that need against your company page and answers with ranked providers and the
                reasoning behind each score.
              </p>
              <p className="settings-muted" style={{ margin: 0 }}>
                Run your first one and it will show up here.
              </p>
            </section>
          ) : (
            <div>
              {matches.map((match) => {
                // Stored in the order the model returned them, which is usually
                // but not always ranked — so pick the best score explicitly.
                const top = match.providers.reduce(
                  (best, provider) => (provider.match > best.match ? provider : best),
                  match.providers[0],
                );

                return (
                  <Link
                    key={match.id}
                    href="/dashboard/match"
                    className="settings-section"
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {match.need}
                    </p>
                    <p className="settings-muted" style={{ margin: "0.45rem 0 0" }}>
                      {top ? `Top match: ${top.name} · ${top.match}%` : "No providers returned"}
                      {formatDate(match.createdAt) && ` · ${formatDate(match.createdAt)}`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
