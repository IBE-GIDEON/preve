/**
 * The account holder's personal profile. Company identity lives in
 * lib/company.ts — this is only the human behind the account, which is why
 * public.profiles stores nothing beyond a name, an avatar, and an email.
 */
export interface ProfileInput {
  fullName: string;
}

export const FULL_NAME_MAX = 80;

export function validateFullName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length > FULL_NAME_MAX) return `Keep your name under ${FULL_NAME_MAX} characters.`;
  return undefined;
}
