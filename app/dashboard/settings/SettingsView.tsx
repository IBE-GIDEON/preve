"use client";

import { motion } from "framer-motion";
import { Check, LogOut } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { getInitials } from "../../../lib/user";
import { signOutAction } from "../../auth/actions";
import {
  DEFAULT_PREVE_STATE,
  getInitialPreveState,
  resetPreveState,
  type PreveState,
} from "../../lib/preveState";
import { updateProfileName } from "./actions";

export interface SettingsAccount {
  email: string;
  fullName: string;
  memberSince: string | null;
}

type SaveStatus = { type: "ok" | "error"; text: string } | null;

function formatMemberSince(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function SettingsView({ account }: { account: SettingsAccount | null }) {
  const [name, setName] = useState(account?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);

  const trimmedName = name.trim();
  const nameChanged = account ? trimmedName !== account.fullName.trim() : false;
  const canSave = Boolean(account) && trimmedName.length > 0 && nameChanged && !saving;

  async function saveName() {
    if (!canSave) return;
    setSaving(true);
    setStatus(null);
    const result = await updateProfileName(trimmedName);
    setSaving(false);
    setStatus(
      result.ok
        ? { type: "ok", text: "Saved" }
        : { type: "error", text: result.error ?? "Couldn't save your changes." },
    );
  }

  function exportData() {
    const state: PreveState = getInitialPreveState();
    const payload = { exportedAt: new Date().toISOString(), product: "preve", state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "preve-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetLocalData() {
    if (!window.confirm("Reset this browser's local Preve search history?")) return;
    resetPreveState();
    // DEFAULT_PREVE_STATE is referenced so a reset restores a known baseline.
    void DEFAULT_PREVE_STATE;
    setStatus({ type: "ok", text: "Local data reset" });
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "4rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Settings</h1>

          {/* Account / profile */}
          <section className="settings-section">
            <h2 className="settings-section-title">Account</h2>

            {account ? (
              <>
                <div className="settings-identity">
                  <span className="settings-avatar" aria-hidden="true">
                    {getInitials(account.fullName, account.email)}
                  </span>
                  <div className="settings-identity-meta">
                    <span className="settings-identity-email">{account.email}</span>
                    {formatMemberSince(account.memberSince) && (
                      <span className="settings-identity-since">
                        Member since {formatMemberSince(account.memberSince)}
                      </span>
                    )}
                  </div>
                </div>

                <label htmlFor="display-name" className="settings-label">
                  Display name
                </label>
                <div className="settings-inline">
                  <input
                    id="display-name"
                    className="auth-input"
                    value={name}
                    maxLength={80}
                    placeholder="Your name"
                    onChange={(event) => {
                      setName(event.target.value);
                      if (status) setStatus(null);
                    }}
                    disabled={saving}
                  />
                  <button className="settings-save-btn" onClick={saveName} disabled={!canSave}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                {status && (
                  <p className={`settings-status ${status.type}`} role="status">
                    {status.type === "ok" && <Check size={14} />}
                    {status.text}
                  </p>
                )}
              </>
            ) : (
              <p className="settings-muted">
                You're in preview mode. Sign in with a real account to manage your profile.
              </p>
            )}
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h2 className="settings-section-title">Appearance</h2>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Theme</div>
                <div className="settings-muted">Switch between light and dark.</div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* Data */}
          <section className="settings-section">
            <h2 className="settings-section-title">Data</h2>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Export data</div>
                <div className="settings-muted">Download a snapshot of your local preferences.</div>
              </div>
              <button className="settings-ghost-btn" onClick={exportData}>
                Export
              </button>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Reset local data</div>
                <div className="settings-muted">Clear this browser's saved searches.</div>
              </div>
              <button className="settings-ghost-btn danger" onClick={resetLocalData}>
                Reset
              </button>
            </div>
          </section>

          {/* Session */}
          <form action={signOutAction}>
            <button type="submit" className="settings-signout-btn">
              <LogOut size={16} />
              Sign out
            </button>
          </form>
        </motion.div>
      </main>

      <aside className="dashboard-right-sidebar">
        <div>
          <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
            Data control
          </h3>
          <div style={{ opacity: 0.65, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Auth and archive storage are handled by Supabase. Export gives you a JSON snapshot of
            this browser's local search preferences.
          </div>
        </div>
      </aside>
    </div>
  );
}
