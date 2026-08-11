"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  NAME_MAX,
  ORG_TYPES,
  TAGLINE_MAX,
  slugify,
  validateName,
  validateSlug,
  validateTagline,
  validateWebsite,
} from "../../lib/company";
import { createClient } from "../../lib/supabase/client";
import CompanyPreviewCard from "./CompanyPreviewCard";
import { checkCompanySlug, createCompany } from "./actions";

type Step = 1 | 2 | 3;
type SlugStatus = { state: "idle" | "checking" | "available" } | { state: "unavailable"; reason: string };

const STEPS: { number: Step; label: string; heading: string; blurb: string }[] = [
  {
    number: 1,
    label: "Page identity",
    heading: "Create a company page",
    blurb: "Start with how buyers and providers will find you.",
  },
  {
    number: 2,
    label: "Company details",
    heading: "Tell us about your organization",
    blurb: "These three answers shape every match we qualify for you.",
  },
  {
    number: 3,
    label: "Profile details",
    heading: "Finish your page",
    blurb: "A logo and a line about what you do — then you're in.",
  },
];

// Server field errors arrive without a step, so the form has to know where each
// one lives: an error the user cannot see is an error they cannot fix.
const FIELD_STEP: Record<string, Step> = {
  name: 1,
  slug: 1,
  website: 1,
  industry: 2,
  size: 2,
  orgType: 2,
  tagline: 3,
  logoUrl: 3,
  verifiedRepresentative: 3,
};

// Mirrors the allow-list on the storage bucket itself (supabase/setup.sql).
// SVG is excluded on both sides: the bucket is public, and it would serve an
// uploaded SVG back with any script inside it intact.
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 4 * 1024 * 1024;
const SLUG_CHECK_DELAY = 500;

const rowStyle: CSSProperties = { marginTop: "1.1rem" };

export default function CompanyRegistration({ userId }: { userId: string }) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: "idle" });
  const [website, setWebsite] = useState("");

  // Step 2
  const [industry, setIndustry] = useState("");
  const [industryQuery, setIndustryQuery] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const [industryActive, setIndustryActive] = useState(0);
  const [size, setSize] = useState("");
  const [orgType, setOrgType] = useState("");

  // Step 3
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verified, setVerified] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const industryListRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const slugRequestRef = useRef(0);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      // Local preview without Supabase env — the flow still runs, minus uploads.
      return null;
    }
  }, []);

  const current = STEPS[step - 1];

  function clearError(field: string) {
    setFieldErrors((errors) => {
      if (!errors[field]) return errors;
      const next = { ...errors };
      delete next[field];
      return next;
    });
  }

  // ── Public URL: suggest, then get out of the way ──────────────────────────
  function handleName(value: string) {
    setName(value);
    clearError("name");
    // Auto-suggest stops for good once the user has touched the URL themselves.
    if (!slugEdited) setSlug(slugify(value));
  }

  function handleSlug(value: string) {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/\s+/g, "-"));
    clearError("slug");
  }

  // Debounced availability check. Every run claims a sequence number so a slow
  // earlier response can never overwrite the answer for what's on screen now.
  useEffect(() => {
    const candidate = slug.trim().toLowerCase();
    const request = ++slugRequestRef.current;

    if (!candidate) {
      setSlugStatus({ state: "idle" });
      return;
    }
    const invalid = validateSlug(candidate);
    if (invalid) {
      setSlugStatus({ state: "unavailable", reason: invalid });
      return;
    }

    setSlugStatus({ state: "checking" });
    const timer = window.setTimeout(async () => {
      const result = await checkCompanySlug(candidate);
      if (request !== slugRequestRef.current) return;
      setSlugStatus(
        result.available
          ? { state: "available" }
          : { state: "unavailable", reason: result.reason ?? "That URL is taken." },
      );
    }, SLUG_CHECK_DELAY);

    return () => window.clearTimeout(timer);
  }, [slug]);

  // ── Industry combobox ─────────────────────────────────────────────────────
  const industryOptions = useMemo<readonly string[]>(() => {
    const query = industryQuery.trim().toLowerCase();
    // An untouched field (query still equal to the selection) shows everything.
    if (!query || query === industry.toLowerCase()) return INDUSTRIES;
    return INDUSTRIES.filter((option) => option.toLowerCase().includes(query));
  }, [industryQuery, industry]);

  useEffect(() => {
    if (!industryOpen) return;
    const option = industryListRef.current?.children[industryActive];
    option?.scrollIntoView({ block: "nearest" });
  }, [industryOpen, industryActive]);

  function selectIndustry(option: string) {
    setIndustry(option);
    setIndustryQuery(option);
    setIndustryOpen(false);
    setIndustryActive(0);
    clearError("industry");
  }

  function handleIndustryQuery(value: string) {
    setIndustryQuery(value);
    setIndustryOpen(true);
    setIndustryActive(0);
    // Typing past a selection un-selects it: only a value from the list counts,
    // because the matching engine reads the industry as a known category.
    const exact = INDUSTRIES.find((option) => option.toLowerCase() === value.trim().toLowerCase());
    setIndustry(exact ?? "");
    if (exact) clearError("industry");
  }

  function handleIndustryKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    const key = event.key;
    if (key === "ArrowDown" || key === "ArrowUp") {
      event.preventDefault();
      setIndustryOpen(true);
      setIndustryActive((active) => {
        const count = industryOptions.length;
        if (count === 0) return 0;
        return (active + (key === "ArrowDown" ? 1 : -1) + count) % count;
      });
      return;
    }
    if (key === "Enter" && industryOpen) {
      const option = industryOptions[industryActive];
      if (option) {
        event.preventDefault();
        selectIndustry(option);
      }
      return;
    }
    if (key === "Escape") setIndustryOpen(false);
  }

  function closeIndustry() {
    setIndustryOpen(false);
    // Snap the text back to the real selection so the field never lies.
    if (industry) setIndustryQuery(industry);
  }

  // ── Logo ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function showLocalPreview(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLogoPreview(url);
  }

  function clearLogo() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLogoPreview("");
    setLogoUrl("");
    setLogoError(null);
  }

  async function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset first so re-picking the same file still fires a change.
    event.target.value = "";
    if (!file) return;

    setLogoError(null);
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Use a PNG, JPG, WEBP, or SVG file.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("Keep the logo under 4MB.");
      return;
    }

    showLocalPreview(file);

    // No storage configured: the preview still updates, we just have nowhere to
    // put the file. Say so rather than failing the whole registration.
    if (!supabase || !userId) {
      setLogoError("Logo storage isn't configured here — your page will be created without one.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        setLogoError("Upload failed. Try again.");
        return;
      }
      setLogoUrl(supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl);
    } catch {
      setLogoError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Steps ─────────────────────────────────────────────────────────────────
  function validateStep(target: Step): Record<string, string> {
    const errors: Record<string, string> = {};

    if (target === 1) {
      const nameError = validateName(name);
      if (nameError) errors.name = nameError;
      const slugError = validateSlug(slug);
      if (slugError) errors.slug = slugError;
      // A URL we already know is taken shouldn't wait for the server to say so.
      else if (slugStatus.state === "unavailable") errors.slug = slugStatus.reason;
      const websiteError = validateWebsite(website);
      if (websiteError) errors.website = websiteError;
    }

    if (target === 2) {
      if (!industry) errors.industry = "Choose an industry from the list.";
      if (!size) errors.size = "Choose an organization size.";
      if (!orgType) errors.orgType = "Choose an organization type.";
    }

    if (target === 3) {
      const taglineError = validateTagline(tagline);
      if (taglineError) errors.tagline = taglineError;
      if (!verified) errors.verifiedRepresentative = "Confirm you're authorized to create this page.";
    }

    return errors;
  }

  function stepFor(errors: Record<string, string>): Step {
    const steps = Object.keys(errors).map((field) => FIELD_STEP[field] ?? 3);
    return (steps.length > 0 ? Math.min(...steps) : step) as Step;
  }

  function handleNext() {
    const errors = validateStep(step);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setFormError(null);
    setStep((value) => Math.min(3, value + 1) as Step);
  }

  function handleBack() {
    setFieldErrors({});
    setFormError(null);
    setStep((value) => Math.max(1, value - 1) as Step);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    // Re-check every step, not just this one: a user can reach step 3 and then
    // edit their way back into an invalid step 1.
    const errors = { ...validateStep(1), ...validateStep(2), ...validateStep(3) };
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStep(stepFor(errors));
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const result = await createCompany({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      website: website.trim(),
      industry,
      size,
      orgType,
      tagline: tagline.trim(),
      logoUrl,
      verifiedRepresentative: verified,
    });

    if (result.ok) {
      // Leave `submitting` set — the button stays busy until the route swaps.
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSubmitting(false);
    if (result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      setStep(stepFor(result.fieldErrors));
    }
    setFormError(result.error ?? "Please fix the highlighted fields.");
  }

  const previewLogo = logoPreview || logoUrl;

  return (
    <div className="app-container" style={{ justifyContent: "center", padding: "2.5rem 1.25rem 4rem" }}>
      <main style={{ width: "100%", maxWidth: "980px" }}>
        {/* Step indicator */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {STEPS.map((entry) => {
            const done = entry.number < step;
            const active = entry.number === step;
            return (
              <div
                key={entry.number}
                aria-current={active ? "step" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.82rem",
                  fontWeight: active ? 700 : 500,
                  opacity: active ? 1 : done ? 0.7 : 0.4,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    border: "1px solid var(--input-border)",
                    background: active || done ? "var(--foreground)" : "transparent",
                    color: active || done ? "var(--background)" : "inherit",
                  }}
                >
                  {done ? <Check size={13} /> : entry.number}
                </span>
                {entry.label}
              </div>
            );
          })}
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>{current.heading}</h1>
        <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>{current.blurb}</p>

        {formError && (
          <div className="auth-alert error" role="alert">
            {formError}
          </div>
        )}

        {/* Form + live preview. Flex-wrap instead of a media query: the preview
            slides under the form on its own once there's no room beside it. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-start" }}>
          <form onSubmit={handleSubmit} style={{ flex: "1 1 420px", minWidth: "min(100%, 300px)" }}>
            {/* Keyed remount rather than AnimatePresence: with mode="wait" the
                outgoing step has to finish exiting before the next one mounts,
                and when that handshake didn't complete the form stayed stuck on
                step 1 while the header had already moved on. Animating only on
                enter has no such dependency. */}
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
                {step === 1 && (
                  <section className="settings-section">
                    <h2 className="settings-section-title">Page identity</h2>

                    <label htmlFor="c-name" className="settings-label">Name*</label>
                    <input
                      id="c-name"
                      className={`auth-input${fieldErrors.name ? " invalid" : ""}`}
                      value={name}
                      onChange={(event) => handleName(event.target.value)}
                      placeholder="Add your organization's name"
                      maxLength={NAME_MAX}
                      autoFocus
                    />
                    {fieldErrors.name ? (
                      <p className="auth-field-error">{fieldErrors.name}</p>
                    ) : (
                      <p className="auth-field-hint">{name.length}/{NAME_MAX}</p>
                    )}

                    <label htmlFor="c-slug" className="settings-label" style={rowStyle}>preve public URL*</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          opacity: 0.55,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        preve.app/company/
                      </span>
                      <input
                        id="c-slug"
                        className={`auth-input${fieldErrors.slug || slugStatus.state === "unavailable" ? " invalid" : ""}`}
                        value={slug}
                        onChange={(event) => handleSlug(event.target.value)}
                        placeholder="your-company"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </div>
                    {fieldErrors.slug ? (
                      <p className="auth-field-error">{fieldErrors.slug}</p>
                    ) : slugStatus.state === "checking" ? (
                      <p className="auth-field-hint">Checking availability…</p>
                    ) : slugStatus.state === "available" ? (
                      <p className="settings-status ok" style={{ margin: "0.4rem 0 0" }}>
                        <Check size={13} /> This URL is available
                      </p>
                    ) : slugStatus.state === "unavailable" ? (
                      <p className="auth-field-error">{slugStatus.reason}</p>
                    ) : (
                      <p className="auth-field-hint">Choose the address people will use to reach your page.</p>
                    )}

                    <label htmlFor="c-website" className="settings-label" style={rowStyle}>Website</label>
                    <input
                      id="c-website"
                      className={`auth-input${fieldErrors.website ? " invalid" : ""}`}
                      value={website}
                      onChange={(event) => {
                        setWebsite(event.target.value);
                        clearError("website");
                      }}
                      placeholder="acme.com"
                      inputMode="url"
                    />
                    {fieldErrors.website ? (
                      <p className="auth-field-error">{fieldErrors.website}</p>
                    ) : (
                      <p className="auth-field-hint">Optional. We'll add https:// for you.</p>
                    )}
                  </section>
                )}

                {step === 2 && (
                  <section className="settings-section">
                    <h2 className="settings-section-title">Company details</h2>

                    <label htmlFor="c-industry" className="settings-label">Industry*</label>
                    <div
                      style={{ position: "relative" }}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeIndustry();
                      }}
                    >
                      <input
                        id="c-industry"
                        role="combobox"
                        aria-expanded={industryOpen}
                        aria-controls="c-industry-list"
                        aria-autocomplete="list"
                        autoComplete="off"
                        className={`auth-input${fieldErrors.industry ? " invalid" : ""}`}
                        value={industryQuery}
                        onChange={(event) => handleIndustryQuery(event.target.value)}
                        onFocus={() => setIndustryOpen(true)}
                        onKeyDown={handleIndustryKeys}
                        placeholder="Search industries"
                      />
                      {industryOpen && (
                        <div
                          id="c-industry-list"
                          role="listbox"
                          ref={industryListRef}
                          style={{
                            position: "absolute",
                            zIndex: 20,
                            top: "calc(100% + 0.35rem)",
                            left: 0,
                            right: 0,
                            maxHeight: "240px",
                            overflowY: "auto",
                            border: "1px solid var(--input-border)",
                            borderRadius: "12px",
                            background: "var(--background)",
                            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                            padding: "0.3rem",
                          }}
                        >
                          {industryOptions.length === 0 ? (
                            <p className="settings-muted" style={{ padding: "0.7rem", margin: 0, fontSize: "0.85rem" }}>
                              No industry matches that.
                            </p>
                          ) : (
                            industryOptions.map((option, index) => (
                              <button
                                key={option}
                                type="button"
                                role="option"
                                aria-selected={option === industry}
                                // Keeps focus in the input, so the click always lands.
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setIndustryActive(index)}
                                onClick={() => selectIndustry(option)}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "0.55rem 0.7rem",
                                  font: "inherit",
                                  fontSize: "0.9rem",
                                  cursor: "pointer",
                                  color: "var(--foreground)",
                                  background:
                                    index === industryActive
                                      ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
                                      : "transparent",
                                  fontWeight: option === industry ? 700 : 400,
                                }}
                              >
                                {option}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {fieldErrors.industry ? (
                      <p className="auth-field-error">{fieldErrors.industry}</p>
                    ) : (
                      <p className="auth-field-hint">Type to filter, then pick from the list.</p>
                    )}

                    <label htmlFor="c-size" className="settings-label" style={rowStyle}>Organization size*</label>
                    <select
                      id="c-size"
                      className={`auth-input${fieldErrors.size ? " invalid" : ""}`}
                      value={size}
                      onChange={(event) => {
                        setSize(event.target.value);
                        clearError("size");
                      }}
                    >
                      <option value="">Select size</option>
                      {COMPANY_SIZES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {fieldErrors.size && <p className="auth-field-error">{fieldErrors.size}</p>}

                    <label htmlFor="c-org-type" className="settings-label" style={rowStyle}>Organization type*</label>
                    <select
                      id="c-org-type"
                      className={`auth-input${fieldErrors.orgType ? " invalid" : ""}`}
                      value={orgType}
                      onChange={(event) => {
                        setOrgType(event.target.value);
                        clearError("orgType");
                      }}
                    >
                      <option value="">Select type</option>
                      {ORG_TYPES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {fieldErrors.orgType && <p className="auth-field-error">{fieldErrors.orgType}</p>}
                  </section>
                )}

                {step === 3 && (
                  <section className="settings-section">
                    <h2 className="settings-section-title">Profile details</h2>

                    <span className="settings-label">Logo</span>
                    <div className="settings-identity">
                      {previewLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewLogo}
                          alt=""
                          style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "12px",
                            objectFit: "cover",
                            border: "1px solid var(--input-border)",
                          }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "12px",
                            border: "1px dashed var(--input-border)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.4,
                          }}
                        >
                          <Upload size={18} />
                        </span>
                      )}
                      <div>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="settings-ghost-btn"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                            {uploading ? "Uploading..." : previewLogo ? "Replace logo" : "Upload logo"}
                          </button>
                          {previewLogo && !uploading && (
                            <button type="button" className="settings-ghost-btn" onClick={clearLogo}>
                              <X size={15} /> Remove
                            </button>
                          )}
                        </div>
                        <p className="settings-muted" style={{ marginTop: "0.5rem" }}>
                          PNG, JPG, WEBP, or SVG, up to 4MB. Optional.
                        </p>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={LOGO_TYPES.join(",")}
                        hidden
                        onChange={handleLogo}
                      />
                    </div>
                    {logoError && <p className="auth-field-error">{logoError}</p>}

                    <label htmlFor="c-tagline" className="settings-label" style={rowStyle}>Tagline</label>
                    <textarea
                      id="c-tagline"
                      className={`auth-input${fieldErrors.tagline ? " invalid" : ""}`}
                      value={tagline}
                      onChange={(event) => {
                        setTagline(event.target.value);
                        clearError("tagline");
                      }}
                      rows={2}
                      maxLength={TAGLINE_MAX}
                      placeholder="e.g. A multi-currency accounting platform for African startups"
                      style={{ resize: "vertical" }}
                    />
                    {fieldErrors.tagline ? (
                      <p className="auth-field-error">{fieldErrors.tagline}</p>
                    ) : (
                      <p className="auth-field-hint">{tagline.length}/{TAGLINE_MAX}</p>
                    )}

                    <label
                      style={{
                        display: "flex",
                        gap: "0.65rem",
                        alignItems: "flex-start",
                        marginTop: "1.4rem",
                        fontSize: "0.88rem",
                        lineHeight: 1.5,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={verified}
                        onChange={(event) => {
                          setVerified(event.target.checked);
                          clearError("verifiedRepresentative");
                        }}
                        style={{ marginTop: "0.2rem", width: "16px", height: "16px", flexShrink: 0 }}
                      />
                      <span>
                        I verify that I am an authorized representative of this organization and have the right to act
                        on its behalf in the creation and management of this page.
                      </span>
                    </label>
                    {fieldErrors.verifiedRepresentative && (
                      <p className="auth-field-error">{fieldErrors.verifiedRepresentative}</p>
                    )}
                  </section>
                )}
            </motion.div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
              {step > 1 && (
                <button type="button" className="settings-ghost-btn" onClick={handleBack} disabled={submitting}>
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  className="auth-primary-btn"
                  style={{ width: "auto", padding: "0.8rem 2rem" }}
                  onClick={handleNext}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="auth-primary-btn"
                  style={{ width: "auto", padding: "0.8rem 2rem" }}
                  disabled={!verified || submitting}
                >
                  {submitting ? <Loader2 size={15} className="spin" /> : null}
                  {submitting ? "Creating page..." : "Create page"}
                </button>
              )}
            </div>
          </form>

          <CompanyPreviewCard
            name={name}
            slug={slug}
            tagline={tagline}
            industry={industry}
            size={size}
            logoUrl={previewLogo}
          />
        </div>
      </main>
    </div>
  );
}
