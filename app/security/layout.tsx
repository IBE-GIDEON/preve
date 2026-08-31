import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Security · preve",
  description: "How preve keeps your account and content secure.",
};

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return children;
}
