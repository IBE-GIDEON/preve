import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy · preve",
  description: "How preve collects, uses, and protects your data.",
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
