"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  COMPANY_SIZES,
  DESCRIPTION_MAX,
  INDUSTRIES,
  ORG_TYPES,
  TAGLINE_MAX,
  NAME_MAX,
  parseList,
  validateSlug,
  type CompanyProfile,
} from "../../../lib/company";
import { createClient } from "../../../lib/supabase/client";
import { getInitials } from "../../../lib/user";
import { checkCompanySlug, updateCompanyLogo, updateCompanyProfile } from "../../onboarding/actions";

type Status = { type: "ok" | "error"; text: string } | null;
type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// The storage bucket is public, so anything uploaded here is servable on the
// open web — hence a tight allow-list rather than "image/*". SVG is excluded
// because a public bucket serves it back with any script inside it intact.
// Mirrors the allowed_mime_types on the bucket itself (supabase/setup.sql).
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 4 * 1024 * 1024;

const twoUp: CSSProperties = {
  display: "grid",
  // Collapses to one column on a phone without needing a media query, which
  // matters because this file may not add any.
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem",
};

const dropdownStyle: CSSProperties = {
  position: "absolute",
  zIndex: 20,
  top: "calc(100% + 0.35rem)",
  left: 0,
  right: 0,
  maxHeight: "232px",
  overflowY: "auto",
  padding: "0.3rem",
  border: "1px solid var(--input-border)",
  borderRadius: "12px",
  background: "var(--background)",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.16)",
};

export default function CompanyProfileForm({ userId, company }: { userId: string; company: CompanyProfile }) {
  const [name, setName] = useState(company.name);
  const [slug, setSlug] = useState(company.slug);
  const [website, setWebsite] = useState(company.website ?? "");
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [size, setSize] = useState(company.size ?? "");
  const [orgType, setOrgType] = useState(company.orgType ?? "");
  const [tagline, setTagline] = useState(company.tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [headquarters, setHeadquarters] = useState(company.headquarters ?? "");
  const [markets, setMarkets] = useState(company.markets.join(", "));
  const [specialties, setSpecialties] = useState(company.specialties.join(", "));
  const [foundedYear, setFoundedYear] = useState(company.foundedYear ? String(company.foundedYear) : "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [industryOpen, setIndustryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  // The logo writes itself the moment it uploads, so it stays out of this
  // snapshot — otherwise Save would light up for a change already persisted.
  const snapshot = JSON.stringify([
    name,
    slug,
    website,
    industry,
    size,
    orgType,
    tagline,
    description,
    headquarters,
    markets,
    specialties,
    foundedYear,
  ]);
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;

  // Debounced availability check on the public URL, same shape as the username
  // check in the account profile editor.
  useEffect(() => {
    const candidate = slug.trim().toLowerCase();
    if (candidate === company.slug.toLowerCase()) {
      setSlugStatus("idle");
      return;
    }
    if (validateSlug(candidate)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const result = await checkCompanySlug(candidate, company.id);
      setSlugStatus(result.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, company.slug, company.id]);

  const industryMatches = useMemo(() => {
    const query = industry.trim().toLowerCase();
    const list = query ? INDUSTRIES.filter((option) => option.toLowerCase().includes(query)) : INDUSTRIES;
    return list.slice(0, 8);
  }, [industry]);

  // The server only accepts values from the closed list, so say so before a save
  // round-trip does.
  const industryOffList = Boolean(industry.trim()) && !INDUSTRIES.some((option) => option === industry.trim());

  async function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !userId) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setStatus({ type: "error", text: "Use a PNG, JPG, WebP, or SVG file." });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setStatus({ type: "error", text: "Logo must be under 4MB." });
      return;
    }

    setUploading(true);
    setStatus(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // The folder is the user's id because that is what the storage policy checks.
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      setStatus({ type: "error", text: "Upload failed. Try again." });
      return;
    }

    const publicUrl = supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
    const result = await updateCompanyLogo(company.id, publicUrl);
    setUploading(false);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error ?? "Couldn't save the logo." });
      return;
    }
    setLogoUrl(publicUrl);
    setStatus({ type: "ok", text: "Logo updated" });
  }

  async function handleRemoveLogo() {
    setUploading(true);
    setStatus(null);
    const result = await updateCompanyLogo(company.id, "");
    setUploading(false);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error ?? "Couldn't remove the logo." });
      return;
    }
    setLogoUrl("");
    setStatus({ type: "ok", text: "Logo removed" });
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    setFieldErrors({});

    const result = await updateCompanyProfile(company.id, {
      name,
      slug: slug.trim().toLowerCase(),
      website,
      industry: industry.trim(),
      size,
      orgType,
      tagline,
      logoUrl,
      // Affirmed once at registration and not something this form can revoke —
      // it only appears here because create and edit share one input shape.
      verifiedRepresentative: true,
      description,
      headquarters,
      markets: parseList(markets),
      specialties: parseList(specialties),
      foundedYear,
    });

    setSaving(false);
    if (result.ok) {
      // Baseline moves to what was actually sent, so anything typed during the
      // round-trip still counts as unsaved.
      setBaseline(snapshot);
      setSlugStatus("idle");
      setStatus({ type: "ok", text: "Page saved" });
      return;
    }
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    setStatus({ type: "error", text: result.error ?? "Please fix the highlighted fields." });
  }

  const taglineOver = tagline.trim().length > TAGLINE_MAX;
  const descriptionOver = description.trim().length > DESCRIPTION_MAX;

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <Link
            href="/dashboard"
            className="auth-inline-link"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.25rem" }}
          >
            <ArrowLeft size={15} /> Back to dashboard
          </Link>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Company page</h1>
          <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>
            This page is the brief the matching engine reads before it ranks providers. The more of it you fill in, the
            more precisely a need can be qualified against your real situation.
          </p>

          {/* Page identity */}
          <section className="settings-section">
            <h2 className="settings-section-title">Page identity</h2>

            <label htmlFor="c-name" className="settings-label">Name</label>
            <input
              id="c-name"
              className={`auth-input${fieldErrors.name ? " invalid" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              maxLength={NAME_MAX}
            />
            {fieldErrors.name && <p className="auth-field-error">{fieldErrors.name}</p>}

            <label htmlFor="c-slug" className="settings-label" style={{ marginTop: "1rem" }}>Public URL</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="settings-muted" style={{ whiteSpace: "nowrap" }}>preve.app/company/</span>
              <input
                id="c-slug"
                className={`auth-input${fieldErrors.slug || slugStatus === "taken" ? " invalid" : ""}`}
                style={{ flex: "1 1 200px", minWidth: 0 }}
                value={slug}
                // Normalized as it is typed so what you see is what gets saved.
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="acme"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            {fieldErrors.slug ? (
              <p className="auth-field-error">{fieldErrors.slug}</p>
            ) : slugStatus === "checking" ? (
              <p className="auth-field-hint">Checking availability…</p>
            ) : slugStatus === "available" ? (
              <p className="settings-status ok" style={{ margin: "0.4rem 0 0" }}><Check size={13} /> Available</p>
            ) : slugStatus === "taken" ? (
              <p className="auth-field-error">That URL is taken.</p>
            ) : slugStatus === "invalid" ? (
              <p className="auth-field-error">{validateSlug(slug.trim().toLowerCase())}</p>
            ) : (
              <p className="auth-field-hint">Changing this breaks any link you have already shared.</p>
            )}

            <label htmlFor="c-website" className="settings-label" style={{ marginTop: "1rem" }}>Website</label>
            <input
              id="c-website"
              className={`auth-input${fieldErrors.website ? " invalid" : ""}`}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="acme.com"
              inputMode="url"
            />
            {fieldErrors.website && <p className="auth-field-error">{fieldErrors.website}</p>}
          </section>

          {/* Company details */}
          <section className="settings-section">
            <h2 className="settings-section-title">Company details</h2>

            <label htmlFor="c-industry" className="settings-label">Industry</label>
            <div style={{ position: "relative" }}>
              <input
                id="c-industry"
                className={`auth-input${fieldErrors.industry ? " invalid" : ""}`}
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  setIndustryOpen(true);
                }}
                onFocus={() => setIndustryOpen(true)}
                onBlur={() => setIndustryOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIndustryOpen(false);
                }}
                placeholder="Type to filter…"
                role="combobox"
                aria-expanded={industryOpen}
                aria-controls="c-industry-list"
                aria-autocomplete="list"
                autoComplete="off"
              />
              {industryOpen && industryMatches.length > 0 && (
                <div id="c-industry-list" role="listbox" aria-label="Industries" style={dropdownStyle}>
                  {industryMatches.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={option === industry}
                      // mousedown lands before blur, so suppressing it is what
                      // keeps the list open long enough for the click to count.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setIndustry(option);
                        setIndustryOpen(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.55rem 0.7rem",
                        borderRadius: "8px",
                        border: "none",
                        background: option === industry ? "var(--input-bg)" : "transparent",
                        color: "inherit",
                        font: "inherit",
                        fontSize: "0.92rem",
                        cursor: "pointer",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldErrors.industry ? (
              <p className="auth-field-error">{fieldErrors.industry}</p>
            ) : industryOffList ? (
              <p className="auth-field-hint">Pick one from the list — providers are segmented by these categories.</p>
            ) : null}

            <div style={{ ...twoUp, marginTop: "1rem" }}>
              <div>
                <label htmlFor="c-size" className="settings-label">Organization size</label>
                <select
                  id="c-size"
                  className={`auth-input${fieldErrors.size ? " invalid" : ""}`}
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.size && <p className="auth-field-error">{fieldErrors.size}</p>}
              </div>
              <div>
                <label htmlFor="c-orgtype" className="settings-label">Organization type</label>
                <select
                  id="c-orgtype"
                  className={`auth-input${fieldErrors.orgType ? " invalid" : ""}`}
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                >
                  <option value="">Select…</option>
                  {ORG_TYPES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {fieldErrors.orgType && <p className="auth-field-error">{fieldErrors.orgType}</p>}
              </div>
            </div>
          </section>

          {/* Profile details */}
          <section className="settings-section">
            <h2 className="settings-section-title">Profile details</h2>

            <div className="settings-identity">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
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
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {getInitials(name, "")}
                </span>
              )}
              <div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="settings-ghost-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || !supabase}
                  >
                    {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                    {uploading ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
                  </button>
                  {logoUrl && (
                    <button type="button" className="settings-ghost-btn" onClick={handleRemoveLogo} disabled={uploading}>
                      Remove
                    </button>
                  )}
                </div>
                <p className="settings-muted" style={{ marginTop: "0.5rem" }}>PNG, JPG, WebP, or SVG, up to 4MB.</p>
              </div>
              <input ref={fileRef} type="file" accept={LOGO_TYPES.join(",")} hidden onChange={handleLogo} />
            </div>

            <label htmlFor="c-tagline" className="settings-label">Tagline</label>
            <input
              id="c-tagline"
              className={`auth-input${fieldErrors.tagline ? " invalid" : ""}`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              // Room to overflow so the counter can warn instead of silently truncating.
              maxLength={TAGLINE_MAX + 20}
              placeholder="What your company does, in one line."
            />
            <p className="auth-field-hint" style={taglineOver ? { color: "#F05522" } : undefined}>
              {tagline.trim().length}/{TAGLINE_MAX}
            </p>
            {fieldErrors.tagline && <p className="auth-field-error">{fieldErrors.tagline}</p>}
          </section>

          {/* About */}
          <section className="settings-section">
            <h2 className="settings-section-title">About</h2>

            <label htmlFor="c-description" className="settings-label">Description</label>
            <textarea
              id="c-description"
              className={`auth-input${fieldErrors.description ? " invalid" : ""}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={DESCRIPTION_MAX + 100}
              placeholder="What you do, who you serve, and how you operate. This is the part the AI leans on hardest when it qualifies a need."
              style={{ resize: "vertical" }}
            />
            <p className="auth-field-hint" style={descriptionOver ? { color: "#F05522" } : undefined}>
              {description.trim().length}/{DESCRIPTION_MAX}
            </p>
            {fieldErrors.description && <p className="auth-field-error">{fieldErrors.description}</p>}

            <div style={{ ...twoUp, marginTop: "1rem" }}>
              <div>
                <label htmlFor="c-hq" className="settings-label">Headquarters</label>
                <input
                  id="c-hq"
                  className="auth-input"
                  value={headquarters}
                  onChange={(e) => setHeadquarters(e.target.value)}
                  placeholder="Lagos, Nigeria"
                />
              </div>
              <div>
                <label htmlFor="c-founded" className="settings-label">Founded</label>
                <input
                  id="c-founded"
                  className={`auth-input${fieldErrors.foundedYear ? " invalid" : ""}`}
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="2019"
                  inputMode="numeric"
                />
                {fieldErrors.foundedYear && <p className="auth-field-error">{fieldErrors.foundedYear}</p>}
              </div>
            </div>

            <label htmlFor="c-markets" className="settings-label" style={{ marginTop: "1rem" }}>Markets</label>
            <input
              id="c-markets"
              className="auth-input"
              value={markets}
              onChange={(e) => setMarkets(e.target.value)}
              placeholder="Nigeria, Ghana, United Kingdom"
            />
            <p className="auth-field-hint">Separate with commas. Where you sell, not where you are.</p>

            <label htmlFor="c-specialties" className="settings-label" style={{ marginTop: "1rem" }}>Specialties</label>
            <input
              id="c-specialties"
              className="auth-input"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="B2B payments, fraud screening, merchant onboarding"
            />
            <p className="auth-field-hint">Separate with commas. Up to 20.</p>
          </section>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              className="settings-save-btn"
              style={{ height: "44px" }}
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? "Saving..." : "Save page"}
            </button>
            {status && (
              <span className={`settings-status ${status.type}`}>
                {status.type === "ok" && <Check size={14} />}
                {status.text}
              </span>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
