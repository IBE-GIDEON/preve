"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { getInitials } from "../../../../lib/user";
import { FULL_NAME_MAX, type ProfileInput } from "../../../../lib/profile";
import { createClient } from "../../../../lib/supabase/client";
import { updateAvatar, updateProfile } from "./actions";

export interface ProfileFormData extends ProfileInput {
  email: string;
  avatarUrl: string;
}

type Status = { type: "ok" | "error"; text: string } | null;

const EMPTY: ProfileFormData = {
  email: "",
  fullName: "",
  avatarUrl: "",
};

export default function ProfileForm({ userId, initial }: { userId: string; initial: ProfileFormData | null }) {
  const data = initial ?? EMPTY;
  const [fullName, setFullName] = useState(data.fullName);
  const [avatarUrl, setAvatarUrl] = useState(data.avatarUrl);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    const result = await updateProfile({ fullName });
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
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Profile</h1>
          <p className="settings-muted" style={{ marginBottom: "1.75rem" }}>
            This is you, not your company. Edit your company page under{" "}
            <Link href="/dashboard/company" className="auth-inline-link">Company</Link>.
          </p>

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
            <h2 className="settings-section-title">Your details</h2>

            <label htmlFor="p-name" className="settings-label">Full name</label>
            <input id="p-name" className={`auth-input${fieldErrors.fullName ? " invalid" : ""}`} value={fullName}
              onChange={(e) => setFullName(e.target.value)} placeholder="Your name" maxLength={FULL_NAME_MAX} />
            {fieldErrors.fullName ? (
              <p className="auth-field-error">{fieldErrors.fullName}</p>
            ) : (
              <p className="auth-field-hint">Shown to teammates and on the match requests you send.</p>
            )}

            <label htmlFor="p-email" className="settings-label" style={{ marginTop: "1rem" }}>Email</label>
            <input id="p-email" className="auth-input" value={data.email} readOnly disabled />
            <p className="auth-field-hint">Your sign-in address. Contact support to change it.</p>
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
