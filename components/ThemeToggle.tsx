"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Avoid layout shifts or flash during SSR
  if (!mounted) {
    return (
      <div 
        style={{
          width: "56px",
          height: "28px",
          borderRadius: "9999px",
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          opacity: 0.5
        }}
      />
    );
  }

  return (
    <div
      onClick={toggleTheme}
      className="theme-toggle-pill"
      role="button"
      aria-label="Toggle dark mode"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        width: "56px",
        height: "28px",
        borderRadius: "9999px",
        background: "var(--input-bg)",
        border: "1px solid var(--input-border)",
        padding: "2px",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 20,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        transition: "border-color 0.2s ease, background-color 0.2s ease"
      }}
    >
      {/* Sliding indicators */}
      <motion.div
        style={{
          position: "absolute",
          left: "2px",
          top: "2px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: "var(--foreground)",
          zIndex: 1,
        }}
        animate={{
          x: theme === "light" ? 0 : 28
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 24
        }}
      />

      {/* Sun Icon (Light Mode indicator) */}
      <div style={{
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        pointerEvents: "none"
      }}>
        <Sun size={13} style={{ 
          color: theme === "light" ? "var(--background)" : "var(--foreground)",
          opacity: theme === "light" ? 1 : 0.4,
          transition: "color 0.25s ease, opacity 0.25s ease"
        }} />
      </div>

      {/* Moon Icon (Dark Mode indicator) */}
      <div style={{
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "22px",
        height: "22px",
        pointerEvents: "none"
      }}>
        <Moon size={13} style={{ 
          color: theme === "dark" ? "var(--background)" : "var(--foreground)",
          opacity: theme === "dark" ? 1 : 0.4,
          transition: "color 0.25s ease, opacity 0.25s ease"
        }} />
      </div>

      <style jsx>{`
        .theme-toggle-pill:hover {
          border-color: color-mix(in srgb, var(--input-border) 80%, var(--foreground)) !important;
        }
      `}</style>
    </div>
  );
}
