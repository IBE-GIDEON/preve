/** Two-letter initials for avatars, derived from a name or email. */
export function getInitials(name: string | null | undefined, email: string): string {
  const source = (name ?? "").trim() || email.trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "U";
}

/** A friendly display name: the full name if set, otherwise the email handle. */
export function getDisplayName(name: string | null | undefined, email: string): string {
  return (name ?? "").trim() || email.split("@")[0];
}
