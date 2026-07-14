"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { CONNECT_PLATFORMS } from "../../../lib/connect-platforms";
import {
  connectAccount,
  disconnectAccount,
  listConnectedAccounts,
  syncAccount,
  type ConnectedAccountMap,
} from "../../../lib/accounts/client";

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
  const [accounts, setAccounts] = useState<ConnectedAccountMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  async function run(platform: string, action: () => Promise<void>) {
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

  return (
    <div className="dashboard-content-area">
      <main className="dashboard-main" style={{ paddingTop: "3rem", alignItems: "flex-start" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.4rem" }}>Connected accounts</h1>
          <p className="settings-muted" style={{ marginBottom: "1.5rem" }}>
            Connect the platforms you publish on. Connections are simulated for now — real OAuth sync
            is coming per platform, but you can manage connection state today.
          </p>

          {error && <p className="auth-field-error" style={{ marginBottom: "1rem" }}>{error}</p>}

          {loading ? (
            <p className="settings-muted">Loading accounts…</p>
          ) : (
            <div className="connect-grid">
              {CONNECT_PLATFORMS.map((platform) => {
                const account = accounts[platform.id];
                const connected = account?.status === "connected" || account?.status === "importing";
                const status = account ? STATUS_STYLES[account.status] : null;
                const isBusy = busy === platform.id;

                return (
                  <section key={platform.id} className="connect-card">
                    <div className="connect-card-main">
                      <span className="connect-icon" style={{ background: `#${platform.icon.hex}` }}>
                        <PlatformIcon icon={platform.icon} color="#ffffff" size={20} title={platform.label} />
                      </span>
                      <div className="connect-card-info">
                        <div className="connect-card-name">
                          {platform.label}
                          {!platform.ready && <span className="account-soon">Soon</span>}
                        </div>
                        <div className="settings-muted connect-card-sub">
                          {connected
                            ? `${account?.handle ? `${platform.handlePrefix}${account.handle} · ` : ""}${lastSyncLabel(account?.lastSyncAt ?? null)}`
                            : status
                              ? "Disconnected"
                              : "Not connected"}
                        </div>
                      </div>
                      {status && (
                        <span className="account-status" style={{ color: status.color, background: status.bg }}>
                          {status.label}
                        </span>
                      )}
                    </div>

                    <div className="connect-card-actions">
                      {connected ? (
                        <>
                          <button className="settings-ghost-btn" disabled={isBusy}
                            onClick={() => run(platform.id, () => syncAccount(platform.id))}>
                            <RefreshCw size={14} className={isBusy ? "spin" : undefined} /> Sync
                          </button>
                          <button className="settings-ghost-btn danger" disabled={isBusy}
                            onClick={() => run(platform.id, () => disconnectAccount(platform.id))}>
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button className="settings-ghost-btn" disabled={isBusy}
                          onClick={() => run(platform.id, () => connectAccount(platform.id, account?.handle ?? ""))}>
                          {isBusy ? "Connecting..." : "Connect"}
                        </button>
                      )}
                    </div>
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
