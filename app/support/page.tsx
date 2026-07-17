import Link from "next/link";
import type { Metadata } from "next";
import { getSupportUrl } from "../../lib/support";

export const metadata: Metadata = {
  title: "Support preve",
  description: "preve is free for creators. Founding supporters keep it alive and lock in 50% off Pro for life.",
};

const TIERS = [
  {
    name: "Supporter",
    amount: "Any amount",
    perks: ["A supporter badge on your profile", "Our genuine thanks — you keep preve alive"],
    highlight: false,
  },
  {
    name: "Founding Supporter",
    amount: "$10 or more",
    perks: ["Everything in Supporter", "50% off Pro — for life, when pricing starts", "Founding supporter badge"],
    highlight: true,
  },
];

export default function SupportPage() {
  const supportUrl = getSupportUrl();

  return (
    <div className="support-page">
      <header className="support-header">
        <Link href="/" className="logo" style={{ textDecoration: "none", marginBottom: 0 }}>
          preve
        </Link>
        <Link href="/dashboard" className="support-back">Back to app →</Link>
      </header>

      <main className="support-main">
        <div className="support-hero">
          <div className="support-heart" aria-hidden="true">♥</div>
          <h1 className="support-title">Support preve</h1>
          <p className="support-lede">
            preve is free for creators, and stays free while we grow — search everything you&rsquo;ve ever
            posted, on a $0 budget. Supporters cover the servers and the AI, and get the founder&rsquo;s
            deal in return.
          </p>
        </div>

        <div className="support-tiers">
          {TIERS.map((tier) => (
            <section key={tier.name} className={`support-tier${tier.highlight ? " highlight" : ""}`}>
              {tier.highlight && <span className="support-tier-flag">Best value</span>}
              <div className="support-tier-amount">{tier.amount}</div>
              <div className="support-tier-name">{tier.name}</div>
              <ul className="support-tier-perks">
                {tier.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {supportUrl ? (
          <>
            <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="support-cta">
              ♥ Support preve
            </a>
            <p className="support-fineprint">
              Secure checkout on our payment page. preve never sees your card. You choose the amount.
            </p>
          </>
        ) : (
          <div className="support-soon">
            <p style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Payments are opening soon.</p>
            <p className="settings-muted" style={{ margin: 0 }}>
              We&rsquo;re setting up secure checkout. Thank you for wanting to back preve this early —
              it means everything.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
