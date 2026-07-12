"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "../../../lib/supabase/client";
import { hasSupabasePublicEnv } from "../../../lib/supabase/env";
import {
  DEFAULT_PREVE_STATE,
  getInitialPreveState,
  resetPreveState,
  savePreveState,
  type PreveState,
} from "../../lib/preveState";

const rowStyle = {
  background: "var(--background)",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: "12px",
  padding: "1.5rem",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "var(--foreground)",
  width: "100%",
  font: "inherit",
  textAlign: "left" as const,
};

export default function SettingsPage() {
  const router = useRouter();
  const [preveState, setPreveState] = useState<PreveState>(DEFAULT_PREVE_STATE);

  useEffect(() => {
    setPreveState(getInitialPreveState());
  }, []);

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      product: "preve",
      state: preveState,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "preve-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    if (hasSupabasePublicEnv()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    const nextState = { ...preveState, onboarded: false };
    setPreveState(nextState);
    savePreveState(nextState);
    router.push("/auth");
    router.refresh();
  }

  function resetLocalData() {
    if (!window.confirm("Reset this browser's local Preve search history?")) return;
    resetPreveState();
    setPreveState(DEFAULT_PREVE_STATE);
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

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button style={rowStyle} className="hover-card">
              <div style={{ fontWeight: 500 }}>Profile</div>
              <div style={{ opacity: 0.5 }}>&rarr;</div>
            </button>

            <button style={rowStyle} className="hover-card">
              <div style={{ fontWeight: 500 }}>Appearance</div>
              <div style={{ opacity: 0.5 }}>&rarr;</div>
            </button>

            <button onClick={exportData} style={rowStyle} className="hover-card">
              <div style={{ fontWeight: 500 }}>Export Data</div>
              <div style={{ opacity: 0.5 }}>&rarr;</div>
            </button>

            <button onClick={resetLocalData} style={{ ...rowStyle, marginTop: "2rem" }} className="hover-card">
              <div style={{ fontWeight: 500, color: "#ef4444" }}>Reset Local Data</div>
            </button>

            <button onClick={signOut} style={rowStyle} className="hover-card">
              <div style={{ fontWeight: 500 }}>Sign Out</div>
            </button>
          </div>
        </motion.div>
      </main>

      <aside className="dashboard-right-sidebar">
        <div>
          <h3 className="suggestions-heading" style={{ marginBottom: "1rem" }}>
            Data Control
          </h3>
          <div style={{ opacity: 0.65, fontSize: "0.9rem", lineHeight: 1.5 }}>
            Auth and archive storage are handled by Supabase. Export gives you a JSON snapshot of this browser's local search preferences.
          </div>
        </div>
      </aside>
    </div>
  );
}
