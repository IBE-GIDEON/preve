"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getInitials } from "../../../../lib/user";
import {
  BIO_MAX,
  SOCIAL_PLATFORMS,
  normalizeUsername,
  validateUsername,
  type ProfileInput,
} from "../../../../lib/profile";
import { createClient } from "../../../../lib/supabase/client";
import { checkUsername, updateAvatar, updateProfile } from "./actions";

export interface ProfileFormData extends ProfileInput {
  email: string;
  avatarUrl: string;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type Status = { type: "ok" | "error"; text: string } | null;

const EMPTY: ProfileFormData = {
  email: "",
  fullName: "",
  username: "",
  bio: "",
  website: "",
  socialLinks: {},
  isPublic: false,
  avatarUrl: "",
};

export default function ProfileForm({ userId, initial }: { userId: string; initial: ProfileFormData | null }) {
  const data = initial ?? EMPTY;
  const [fullName, setFullName] = useState(data.fullName);
  const [username, setUsername] = useState(data.username);
  const [bio, setBio] = useState(data.bio);
  const [website, setWebsite] = useState(data.website);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(data.socialLinks);
  const [isPublic, setIsPublic] = useState(data.isPublic);
  const [avatarUrl, setAvatarUrl] = useState(data.avatarUrl);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
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

  // Debounced username availability check.
  useEffect(() => {
    const normalized = normalizeUsername(username);
    if (normalized === normalizeUsername(data.username)) {
      setUsernameStatus("idle");
      return;
    }
    const invalid = validateUsername(normalized);
    if (invalid) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const result = await checkUsername(normalized);
      setUsernameStatus(result.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [username, data.username]);

  async function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !userId) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setStatus({ type: "error", text: "Image must be under 3MB." });
      return;
    }

    setUploading(true);
    setStatus(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      setStatus({ type: "error", text: "Upload failed. Try again." });
      return;
    }
    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const result = await updateAvatar(publicUrl);
    setUploading(false);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error ?? "Couldn't save avatar." });
      return;
    }
    setAvatarUrl(publicUrl);
    setStatus({ type: "ok", text: "Avatar updated" });
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    const result = await updateProfile({ fullName, username, bio, website, socialLinks, isPublic });
    setSaving(false);
    if (result.ok) {
      setStatus({ type: "ok", text: "Profile saved" });
      return;
    }
    if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    setStatus({ type: "error", text: result.error ?? "Please fix the highlighted fields." });
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <Link href="/dashboard/settings" className="auth-inline-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.25rem" }}>
            <ArrowLeft size={15} /> Back to settings
          </Link>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.75rem" }}>Profile</h1>

          {/* Avatar */}
          <section className="settings-section">
            <h2 className="settings-section-title">Avatar</h2>
            <div className="settings-identity">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="settings-avatar" style={{ objectFit: "cover" }} />
              ) : (
                <span className="settings-avatar" aria-hidden="true">
                  {getInitials(fullName, data.email)}
                </span>
              )}
              <div>
                <button
                  type="button"
                  className="settings-ghost-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || !supabase}
                >
                  {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                  {uploading ? "Uploading..." : "Upload image"}
                </button>
                <p className="settings-muted" style={{ marginTop: "0.5rem" }}>PNG or JPG, up to 3MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            </div>
          </section>

          {/* Identity */}
          <section className="settings-section">
            <h2 className="settings-section-title">Public identity</h2>

            <label htmlFor="p-name" className="settings-label">Display name</label>
            <input id="p-name" className={`auth-input${fieldErrors.fullName ? " invalid" : ""}`} value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="Your name" maxLength={80} />
            {fieldErrors.fullName && <p className="auth-field-error">{fieldErrors.fullName}</p>}

            <label htmlFor="p-username" className="settings-label" style={{ marginTop: "1rem" }}>Username</label>
            <div className="profile-username">
              <span className="profile-username-at">@</span>
              <input id="p-username" className={`auth-input${fieldErrors.username || usernameStatus === "taken" ? " invalid" : ""}`}
                value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoCapitalize="none" spellCheck={false} />
            </div>
            {fieldErrors.username ? (
              <p className="auth-field-error">{fieldErrors.username}</p>
            ) : usernameStatus === "checking" ? (
              <p className="auth-field-hint">Checking availability…</p>
            ) : usernameStatus === "available" ? (
              <p className="settings-status ok" style={{ margin: "0.4rem 0 0" }}><Check size={13} /> Available</p>
            ) : usernameStatus === "taken" ? (
              <p className="auth-field-error">That username is taken.</p>
            ) : usernameStatus === "invalid" ? (
              <p className="auth-field-error">{validateUsername(username)}</p>
            ) : null}

            <label htmlFor="p-bio" className="settings-label" style={{ marginTop: "1rem" }}>Bio</label>
            <textarea id="p-bio" className={`auth-input${fieldErrors.bio ? " invalid" : ""}`} value={bio}
              onChange={(e) => setBio(e.target.value)} rows={3} maxLength={BIO_MAX + 20}
              placeholder="A sentence about you and what you write about." style={{ resize: "vertical" }} />
            <p className="auth-field-hint">{bio.length}/{BIO_MAX}</p>
            {fieldErrors.bio && <p className="auth-field-error">{fieldErrors.bio}</p>}

            <label htmlFor="p-website" className="settings-label" style={{ marginTop: "1rem" }}>Website</label>
            <input id="p-website" className={`auth-input${fieldErrors.website ? " invalid" : ""}`} value={website}
              onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" inputMode="url" />
            {fieldErrors.website && <p className="auth-field-error">{fieldErrors.website}</p>}
          </section>

          {/* Social links */}
          <section className="settings-section">
            <h2 className="settings-section-title">Social links</h2>
            {SOCIAL_PLATFORMS.map((platform) => (
              <div key={platform.key} style={{ marginBottom: "0.85rem" }}>
                <label htmlFor={`s-${platform.key}`} className="settings-label">{platform.label}</label>
                <input id={`s-${platform.key}`}
                  className={`auth-input${fieldErrors[`social_${platform.key}`] ? " invalid" : ""}`}
                  value={socialLinks[platform.key] ?? ""}
                  onChange={(e) => setSocialLinks((prev) => ({ ...prev, [platform.key]: e.target.value }))}
                  placeholder={platform.placeholder} inputMode="url" />
                {fieldErrors[`social_${platform.key}`] && (
                  <p className="auth-field-error">{fieldErrors[`social_${platform.key}`]}</p>
                )}
              </div>
            ))}
          </section>

          {/* Visibility */}
          <section className="settings-section">
            <h2 className="settings-section-title">Visibility</h2>
            <div className="settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="settings-row-label">Public profile</div>
                <div className="settings-muted">
                  {isPublic
                    ? "Anyone can view your profile, public posts, and collections."
                    : "Your profile is private and only visible to you."}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic((v) => !v)}
                className={`profile-switch${isPublic ? " on" : ""}`}
              >
                <span className="profile-switch-knob" />
              </button>
            </div>
          </section>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="settings-save-btn" style={{ height: "44px" }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
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
