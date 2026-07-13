export type AuthMode = "sign-in" | "sign-up";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum password length enforced on sign-up (matches Supabase default). */
export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

/** Returns an error message, or `undefined` when the email is valid. */
export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value)) return "That doesn't look like a valid email.";
  return undefined;
}

/**
 * Returns an error message, or `undefined` when the password is valid.
 * Sign-up enforces a real policy; sign-in only checks presence so existing
 * accounts are never locked out by newer rules.
 */
export function validatePassword(password: string, mode: AuthMode): string | undefined {
  if (!password) return "Enter your password.";
  if (mode === "sign-in") return undefined;

  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return undefined;
}
