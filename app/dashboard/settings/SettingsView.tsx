"use client";

import { motion } from "framer-motion";
import { ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "../../../components/ThemeToggle";
import { getInitials } from "../../../lib/user";
import { signOutAction, signOutAllDevicesAction } from "../../auth/actions";
import { deleteAccount, exportUserData } from "./actions";

export interface SettingsAccount {
  email: string;
  fullName: string;
  memberSince: string | null;
}

type Status = { type: "ok" | "error"; text: string } | null;

function formatMemberSince(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface SettingsViewProps {
  account: SettingsAccount | null;
  canDeleteAccount: boolean;
}

export default function SettingsView({ account, canDeleteAccount }: SettingsViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function handleExport() {
    setBusy("export");
    setStatus(null);
    const result = await exportUserData();
    setBusy(null);
    if (!result.ok) {
      setStatus({ type: "error", text: result.error ?? "Export failed." });
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "preve-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({ type: "ok", text: "Export downloaded" });
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setBusy("delete");
    const result = await deleteAccount();
    if (!result.ok) {
      setBusy(null);
      setStatus({ type: "error", text: result.error ?? "Could not delete account." });
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "640px", margin: "0 auto" }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.75rem" }}>Settings</h1>

          {/* Account */}
          <section className="settings-section">
            <h2 className="settings-section-title">Account</h2>
            {account ? (
              <Link href="/dashboard/settings/profile" className="settings-account-link">
                <span className="settings-avatar" aria-hidden="true">
                  {getInitials(account.fullName, account.email)}
                </span>
                <span className="settings-identity-meta" style={{ flex: 1 }}>
                  <span className="settings-identity-email">{account.fullName || account.email}</span>
                  <span className="settings-identity-since">
                    {account.email}
                    {formatMemberSince(account.memberSince) ? ` · Member since ${formatMemberSince(account.memberSince)}` : ""}
                  </span>
                </span>
                <span className="settings-account-cta">
                  Edit profile <ChevronRight size={16} />
                </span>
              </Link>
            ) : (
              <p className="settings-muted">Sign in with a real account to manage your profile.</p>
            )}
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h2 className="settings-section-title">Appearance</h2>
            <div className="settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="settings-row-label">Theme</div>
                <div className="settings-muted">Switch between light and dark.</div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* Security */}
          <section className="settings-section">
            <h2 className="settings-section-title">Security</h2>

            <div className="settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="settings-row-label">This device</div>
                <div className="settings-muted">Sign out of your current session.</div>
              </div>
              <form action={signOutAction}>
                <button type="submit" className="settings-ghost-btn">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">All devices</div>
                <div className="settings-muted">
                  Sign out everywhere. Supabase doesn't expose a per-device list, so this is the
                  reliable way to end other sessions.
                </div>
              </div>
              <form action={signOutAllDevicesAction}>
                <button type="submit" className="settings-ghost-btn">Sign out all</button>
              </form>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Export data</div>
                <div className="settings-muted">Download everything in your archive as JSON.</div>
              </div>
              <button className="settings-ghost-btn" onClick={handleExport} disabled={busy === "export"}>
                {busy === "export" ? "Preparing..." : "Export"}
              </button>
            </div>
          </section>

          {/* Danger zone */}
          <section className="settings-section" style={{ borderColor: "color-mix(in srgb, #ef4444 30%, var(--input-border))" }}>
            <h2 className="settings-section-title" style={{ color: "#ef4444", opacity: 0.85 }}>Danger zone</h2>
            <div className="settings-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div>
                <div className="settings-row-label">Delete account</div>
                <div className="settings-muted">Permanently remove your account and all imported data. This can't be undone.</div>
              </div>
              {!confirmingDelete && (
                <button className="settings-ghost-btn danger" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </button>
              )}
            </div>

            {confirmingDelete && (
              <div style={{ marginTop: "1rem" }}>
                {!canDeleteAccount && (
                  <p className="auth-field-error" style={{ marginBottom: "0.6rem" }}>
                    Deletion isn't configured yet — add SUPABASE_SERVICE_ROLE_KEY on the server.
                  </p>
                )}
                <label htmlFor="confirm-delete" className="settings-label">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  id="confirm-delete"
                  className="auth-input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
                  <button
                    className="settings-ghost-btn danger"
                    onClick={handleDelete}
                    disabled={confirmText !== "DELETE" || !canDeleteAccount || busy === "delete"}
                  >
                    {busy === "delete" ? "Deleting..." : "Permanently delete"}
                  </button>
                  <button
                    className="settings-ghost-btn"
                    onClick={() => {
                      setConfirmingDelete(false);
                      setConfirmText("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {status && (
            <p className={`settings-status ${status.type}`} role="status">
              {status.text}
            </p>
          )}
        </motion.div>
      </main>

      <aside className="dashboard-right-sidebar">
        <div>
          <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
            Your data
          </h3>
          <div style={{ opacity: 0.65, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Auth and archive storage are handled by Supabase. Export gives you a full JSON snapshot
            of your account, profile, and archived content.
          </div>
        </div>
      </aside>
    </div>
  );
}
