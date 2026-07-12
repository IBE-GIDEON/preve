"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

type OnboardingState = "welcome" | "connect" | "complete";

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingState>("welcome");
  const router = useRouter();

  useEffect(() => {
    if (step !== "welcome") return;
    const timer = window.setTimeout(() => setStep("connect"), 1800);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "complete") return;
    const timer = window.setTimeout(() => router.push("/dashboard/imports"), 900);
    return () => window.clearTimeout(timer);
  }, [step, router]);

  return (
    <div className="app-container" style={{ alignItems: "center", justifyContent: "center" }}>
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: "center" }}
          >
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>Welcome to preve</h1>
            <p style={{ opacity: 0.6, fontSize: "1.2rem" }}>Let's organize your words.</p>
          </motion.div>
        )}

        {step === "connect" && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ textAlign: "center", maxWidth: "500px", width: "100%" }}
          >
            <h2 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "2rem" }}>
              Bring in your first archive.
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,69,0,0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("complete")}
                style={{
                  padding: "1.5rem",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  fontSize: "1.2rem",
                  fontWeight: 500,
                }}
                className="hover-card"
              >
                <span style={{ color: "#FF4500", fontSize: "1.5rem", fontWeight: 700 }}>R</span>
                Import Content
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/dashboard")}
                style={{
                  padding: "1.5rem",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  fontSize: "1.2rem",
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                <span style={{ color: "var(--foreground)", fontSize: "1.5rem", fontWeight: 700 }}>P</span>
                Go to Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center",
              padding: "3rem",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "16px",
              background: "var(--background)",
            }}
          >
            <div style={{ color: "#22c55e", fontSize: "3rem", marginBottom: "1rem" }}>&#10003;</div>
            <h2 style={{ fontSize: "2rem", fontWeight: 600, marginBottom: "0.75rem" }}>Account Ready</h2>
            <p style={{ opacity: 0.55 }}>Opening imports...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
