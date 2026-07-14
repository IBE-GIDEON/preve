"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  connectAccount,
  disconnectAccount,
  listConnectedAccounts,
  syncAccount,
  type AccountPlatform,
  type ConnectedAccountMap,
} from "../../../lib/accounts/client";

interface PlatformMeta {
  id: AccountPlatform;
  name: string;
  color: string;
  mark: string;
  handlePrefix: string;
  ready: boolean;
}

const PLATFORMS: PlatformMeta[] = [
  { id: "reddit", name: "Reddit", color: "#FF4500", mark: "r", handlePrefix: "u/", ready: true },
  { id: "x", name: "X", color: "#0f1419", mark: "X", handlePrefix: "@", ready: false },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", mark: "in", handlePrefix: "", ready: false },
];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: "Connected", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
  disconnected: { label: "Disconnected", color: "var(--foreground)", bg: "color-mix(in srgb, var(--foreground) 8%, transparent)" },
  importing: { label: "Syncing", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  error: { label: "Error", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function lastSyncLabel(iso: string | null) {
  if (!iso) return "Never synced";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Synced just now";
  if (mins < 60) return `Synced ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.round(hours / 24)}d ago`;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccountMap>({ reddit: null, x: null, linkedin: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState<AccountPlatform | null>(null);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState<AccountPlatform | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setAccounts(await listConnectedAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function run(platform: AccountPlatform, action: () => Promise<void>) {
    setBusy(platform);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function handleConnect(platform: AccountPlatform) {
    await run(platform, () => connectAccount(platform, handle));
    setConnecting(null);
    setHandle("");
  }

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "680px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Connected accounts</h1>
          <p className="settings-muted" style={{ marginBottom: "1.5rem" }}>
            Link the platforms you publish on. Connections are simulated for now — real OAuth sync is
            coming, but you can manage the connection state today.
          </p>

          {error && <p className="auth-field-error" style={{ marginBottom: "1rem" }}>{error}</p>}

          {loading ? (
            <p className="settings-muted">Loading accounts…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {PLATFORMS.map((platform) => {
                const account = accounts[platform.id];
                const isConnected = account?.status === "connected" || account?.status === "importing";
                const status = STATUS_STYLES[account?.status ?? "disconnected"];
                const isBusy = busy === platform.id;

                return (
                  <section key={platform.id} className="account-card">
                    <div className="account-card-head">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                        <span className="account-mark" style={{ background: platform.color }}>{platform.mark}</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>{platform.name}</span>
                            {!platform.ready && <span className="account-soon">OAuth soon</span>}
                          </div>
                          <div className="settings-muted" style={{ fontSize: "0.85rem" }}>
                            {isConnected
                              ? `${account?.handle ? `${platform.handlePrefix}${account.handle} · ` : ""}${lastSyncLabel(account?.lastSyncAt ?? null)}`
                              : "Not connected"}
                          </div>
                        </div>
                      </div>
                      <span className="account-status" style={{ color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </div>

                    {connecting === platform.id ? (
                      <div className="account-connect-row">
                        <div className="profile-username" style={{ flex: 1 }}>
                          {platform.handlePrefix && <span className="profile-username-at">{platform.handlePrefix}</span>}
                          <input
                            className="auth-input"
                            style={platform.handlePrefix ? undefined : { paddingLeft: "1rem" }}
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="your handle"
                            autoFocus
                          />
                        </div>
                        <button className="settings-save-btn" style={{ height: "40px" }}
                          onClick={() => handleConnect(platform.id)} disabled={isBusy}>
                          {isBusy ? "..." : "Connect"}
                        </button>
                        <button className="settings-ghost-btn" onClick={() => { setConnecting(null); setHandle(""); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="account-actions">
                        {isConnected ? (
                          <>
                            <button className="settings-ghost-btn" disabled={isBusy}
                              onClick={() => run(platform.id, () => syncAccount(platform.id))}>
                              <RefreshCw size={14} className={isBusy ? "spin" : undefined} /> Sync now
                            </button>
                            <button className="settings-ghost-btn danger" disabled={isBusy}
                              onClick={() => run(platform.id, () => disconnectAccount(platform.id))}>
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button className="settings-ghost-btn" onClick={() => { setConnecting(platform.id); setHandle(account?.handle ?? ""); }}>
                            Connect
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
