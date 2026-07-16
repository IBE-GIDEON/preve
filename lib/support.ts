// "Support preve" — a hosted payment page (Paystack / Flutterwave / Stripe
// Payment Link / Ko-fi…), NOT an in-app payment integration. preve never
// touches cards; it just opens this link. Buttons render only when the env
// var is set, so the feature is invisible until the founder turns it on.

export function getSupportUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_DONATE_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : null;
}
