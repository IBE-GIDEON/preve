"use client";

import { useEffect } from "react";

/**
 * Fires a background re-sync of the user's connected accounts once when the app
 * opens, so newly-posted content shows up automatically ("sync on open").
 * Silent and fire-and-forget; the /api/sync route throttles each account
 * server-side (10 min), so rapid reloads never hammer the platforms.
 */
export default function AutoSync() {
  useEffect(() => {
    try {
      const KEY = "preve:autosync";
      const last = Number(sessionStorage.getItem(KEY) || "0");
      if (Date.now() - last < 60_000) return; // avoid duplicate calls on quick remounts
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // sessionStorage unavailable — still sync; the server throttle covers it.
    }
    fetch("/api/sync", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
