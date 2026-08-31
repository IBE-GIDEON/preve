import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service · preve",
  description: "The terms for using preve.",
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
