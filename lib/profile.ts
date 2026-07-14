export interface SocialPlatform {
  key: string;
  label: string;
  placeholder: string;
}

/** Social links we surface in the profile editor (stored in profiles.social_links). */
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "x", label: "X", placeholder: "https://x.com/username" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@username" },
];

export interface ProfileInput {
  fullName: string;
  username: string;
  bio: string;
  website: string;
  socialLinks: Record<string, string>;
  isPublic: boolean;
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const BIO_MAX = 280;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string): string | undefined {
  const username = normalizeUsername(value);
  if (!username) return "Choose a username.";
  if (username.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!USERNAME_PATTERN.test(username)) return "Only lowercase letters, numbers, and underscores.";
  return undefined;
}

/** Validate an optional URL field (empty is allowed). */
export function validateUrl(value: string, label = "URL"): string | undefined {
  const url = value.trim();
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `Enter a valid ${label} (http/https).`;
    }
    return undefined;
  } catch {
    return `Enter a valid ${label}.`;
  }
}

export function validateBio(value: string): string | undefined {
  if (value.length > BIO_MAX) return `Keep your bio under ${BIO_MAX} characters.`;
  return undefined;
}
