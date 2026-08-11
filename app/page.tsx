"use client";

import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Building2,
  ClipboardList,
  LogIn,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

type Feature = {
  title: string;
  copy: string;
  Icon: LucideIcon;
  widgetId?: "need" | "qualify" | "match";
};

const NeedWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--input-border)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
      <ClipboardList size={12} style={{ opacity: 0.5 }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)' }}>"We need cyber insurance"</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.72rem', opacity: 0.8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
        <span>Industry</span><span style={{ fontWeight: 600 }}>Technology</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
        <span>Employees</span><span style={{ fontWeight: 600 }}>4,000+</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
        <span>Exposure</span><span style={{ fontWeight: 600 }}>Global</span>
      </div>
    </div>
  </div>
);

const QualifyWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', opacity: 0.6, borderBottom: '1px solid var(--input-border)', paddingBottom: '0.4rem' }}>
      <span>Qualifying the need…</span>
      <span className="landing-mock-remix-status">Analyzing</span>
    </div>
    {["High digital dependency", "Handles customer data at scale", "Multi-jurisdiction compliance"].map((signal) => (
      <div key={signal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--input-border)', borderRadius: '999px', padding: '0.4rem 0.8rem', fontSize: '0.72rem' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
        {signal}
      </div>
    ))}
  </div>
);

const MatchWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    {[
      { name: "Provider A", score: 94 },
      { name: "Provider B", score: 89 },
      { name: "Provider C", score: 84 },
    ].map((p) => (
      <div key={p.name} style={{ border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.55rem 0.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          <span>{p.name}</span>
          <span style={{ color: '#10B981' }}>{p.score}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '999px', background: 'var(--input-border)', overflow: 'hidden' }}>
          <div style={{ width: `${p.score}%`, height: '100%', background: '#10B981' }} />
        </div>
      </div>
    ))}
  </div>
);

const workflow: Feature[] = [
  {
    title: "Describe your need",
    copy: "Tell Preve what your business is trying to get done — insurance, infrastructure, accounting, legal, recruiting — in plain language.",
    Icon: ClipboardList,
    widgetId: "need"
  },
  {
    title: "AI qualifies it",
    copy: "Preve analyzes your company's industry, size, markets, and risk profile to work out what actually matters in a provider.",
    Icon: Brain,
    widgetId: "qualify"
  },
  {
    title: "Get matched, with reasons",
    copy: "Ranked providers with a match score and a plain-English explanation of why each one fits — not a directory, a recommendation.",
    Icon: Target,
    widgetId: "match"
  },
];

const examples = [
  { company: "A SaaS company", need: "Cyber insurance", provider: "Specialist tech insurers" },
  { company: "A payments startup", need: "Cloud infrastructure", provider: "AWS, Azure, or a specialist" },
  { company: "An early-stage startup", need: "Accounting", provider: "Startup-focused accounting firms" },
  { company: "A streaming platform", need: "Data-center capacity", provider: "Infrastructure providers" },
  { company: "A company hiring 50 engineers", need: "Recruitment", provider: "Technical recruiting firms" },
  { company: "A company expanding into Nigeria", need: "Legal & compliance", provider: "Local counsel" },
];

const specifications = [
  {
    number: "01",
    title: "Real Qualification",
    copy: "Preve doesn't keyword-match a directory. It builds a profile of your company — industry, scale, markets, risk — and derives what a good provider must actually offer you."
  },
  {
    number: "02",
    title: "Explained Matches",
    copy: "Every recommendation comes with a match score and the reasoning behind it, so procurement decisions are defensible instead of a gut call from a Google search."
  },
  {
    number: "03",
    title: "Two-Sided Network",
    copy: "Companies bring needs; providers list capabilities, industries, pricing, and requirements. The matching engine scores fit across both sides."
  },
  {
    number: "04",
    title: "Private by Default",
    copy: "Your company profile and requests stay yours. We don't sell your procurement intent to lead brokers or train models on your data."
  }
];

export default function LandingPage() {
  const [footerEmail, setFooterEmail] = useState("");
  const [footerSubscribed, setFooterSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (footerEmail.trim()) {
      setFooterSubscribed(true);
      setFooterEmail("");
    }
  };

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>

      <section className="legacy-landing-shell" aria-labelledby="legacy-hero-title" style={{ position: 'relative', zIndex: 10, overflow: 'hidden' }}>

        <header className="legacy-landing-header" style={{ position: 'relative', zIndex: 10 }}>
          <div className="logo" style={{ marginBottom: 0 }}>
            <img src="/images/preve-search-mark.png" alt="" className="logo-mark" />
            <span>preve</span>
          </div>
          <ThemeToggle />
        </header>

        <div className="legacy-landing-main" style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="legacy-landing-hero"
            style={{ pointerEvents: 'auto' }}
          >
            <h1 id="legacy-hero-title">Tell Us What Your Business Needs. We&apos;ll Find Who Provides It.</h1>
            <p>
              Preve is AI procurement infrastructure: it understands your company&apos;s actual situation and matches every business need with the right provider — with the reasoning spelled out.
            </p>

            <Link href="/auth?next=/dashboard/match" className="legacy-landing-link">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="legacy-landing-button">
                <LogIn size={24} />
                Find your providers
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <main>
        <section id="about" className="landing-section landing-about">
          <motion.div
            className="landing-section-copy"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="landing-section-label">About us</span>
            <h2>We are building the AI procurement layer for businesses.</h2>
            <p>
              Businesses constantly buy services from other businesses — insurance, cloud, accounting, legal, recruiting, logistics. Preve understands what your company needs, qualifies it against your real situation, and matches it with the providers most suitable to deliver.
            </p>
          </motion.div>
          <motion.div
            className="landing-about-demo"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55, delay: 0.08 }}
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div style={{ width: "100%", maxWidth: "380px", border: "1px solid var(--input-border)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ borderBottom: "1px solid var(--input-border)", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", fontWeight: 600 }}>
                <Sparkles size={14} color="#10B981" /> Recommended for your need
              </div>
              <MatchWidget />
            </div>
          </motion.div>
        </section>

        <section id="workflow" className="landing-section landing-workflow">
          <div className="landing-section-heading">
            <span className="landing-section-label">How it works</span>
            <h2>From "we need this" to the right provider in one flow.</h2>
          </div>
          <div className="landing-feature-grid three">
            {workflow.map(({ title, copy, Icon, widgetId }, index) => (
              <motion.article
                key={title}
                className="landing-feature"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "430px", justifyContent: "space-between" }}
              >
                <div style={{ width: "100%", height: "200px", overflow: "hidden", borderBottom: "1px solid color-mix(in srgb, var(--input-border) 60%, transparent)", background: "rgba(0, 0, 0, 0.015)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {widgetId === "need" && <NeedWidget />}
                  {widgetId === "qualify" && <QualifyWidget />}
                  {widgetId === "match" && <MatchWidget />}
                </div>
                <div style={{ padding: "1.5rem 1.6rem 1.75rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    <Icon size={18} className="landing-feature-icon" style={{ flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: "1.55" }}>{copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="network" className="landing-section landing-community">
          <motion.div
            className="landing-community-demo"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55 }}
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
                  <Building2 size={15} /> Demand side
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55, opacity: 0.8 }}>
                  Companies tell Preve what they&apos;re trying to accomplish — one need or a whole expansion.
                </p>
              </div>
              <div style={{ border: "1px solid var(--input-border)", borderRadius: "16px", padding: "1.1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
                  <ShieldCheck size={15} /> Supply side
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.55, opacity: 0.8 }}>
                  Providers list capabilities, industries, pricing, locations, and requirements — and get matched to qualified buyers.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="landing-section-copy"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="landing-section-label">The network</span>
            <h2>Two sides, one matching engine.</h2>
            <p>
              Preve scores fit between what a company actually needs and what each provider actually offers — industry focus, scale, geography, risk appetite — then explains why each match ranks where it does.
            </p>
          </motion.div>
        </section>

        <section id="examples" className="landing-section landing-insights" style={{ paddingBottom: "2rem" }}>
          <div className="landing-section-heading narrow">
            <span className="landing-section-label">What it handles</span>
            <h2>Every service your business buys from another business.</h2>
          </div>
          <div className="landing-feature-grid three">
            {examples.map(({ company, need, provider }, index) => (
              <motion.article
                key={`${company}-${need}`}
                className="landing-feature"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                style={{ padding: "1.4rem 1.5rem" }}
              >
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.6 }}>{company}</p>
                <h3 style={{ margin: "0.3rem 0 0.6rem", fontSize: "1.05rem", fontWeight: 700 }}>{need}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", opacity: 0.85 }}>
                  <ArrowRight size={13} style={{ flexShrink: 0 }} /> {provider}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="trust" className="landing-section landing-capabilities">
          <div className="landing-specs-container">
            <div className="landing-specs-copy">
              <span className="landing-section-label">Specifications</span>
              <h2>A recommendation engine, not a directory.</h2>
              <p>
                Anyone can list vendors. Preve&apos;s value is the qualification in between: understanding your company well enough that the match — and the explanation for it — is worth trusting.
              </p>
            </div>

            <div className="landing-specs-list">
              {specifications.map(({ number, title, copy }, index) => (
                <motion.div
                  key={title}
                  className="landing-spec-row"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                >
                  <div className="landing-spec-header">
                    <span className="landing-spec-number">{number}</span>
                    <h3 className="landing-spec-title">{title}</h3>
                  </div>
                  <p className="landing-spec-copy-text">{copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-final-section">
          <motion.div
            className="landing-final-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.55 }}
          >
            <span className="landing-section-label">Start with one need</span>
            <h2>Stop googling providers. Get matched.</h2>
            <p style={{ maxWidth: "520px", margin: "0 auto 1.5rem", fontSize: "1.05rem", opacity: 0.85, lineHeight: 1.6 }}>
              Describe what your business needs, and Preve will qualify it and rank the providers best placed to deliver — with the reasoning attached.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
              <Link href="/auth?next=/dashboard/match" className="landing-primary-cta" style={{ display: "inline-flex", gap: "0.5rem", borderRadius: "100px", padding: "0.9rem 2.25rem", alignItems: "center" }}>
                <span>Match my first need</span>
                <ArrowRight size={18} />
              </Link>
              <span style={{ fontSize: "0.75rem", opacity: 0.5, fontStyle: "italic" }}>
                No credit card required &bull; Free while in early access
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-brand">
            <div className="logo">
              <img src="/images/preve-search-mark.png" alt="" className="logo-mark" />
              <span>preve</span>
            </div>
            <p>
              AI procurement infrastructure: your business needs, qualified and matched with the right providers.
            </p>
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                required
                className="footer-newsletter-input"
              />
              {footerSubscribed ? (
                <div className="footer-newsletter-success">
                  <span>✓</span> Subscribed to launch notes!
                </div>
              ) : (
                <button type="submit" className="footer-newsletter-btn">
                  Subscribe
                </button>
              )}
            </form>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Product</h4>
            <Link href="#workflow" className="footer-link">How It Works</Link>
            <Link href="#network" className="footer-link">The Network</Link>
            <Link href="#examples" className="footer-link">What It Handles</Link>
            <Link href="#trust" className="footer-link">Specifications</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Resources</h4>
            <Link href="#about" className="footer-link">About</Link>
            <Link href="/security" className="footer-link">Security Policy</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Access</h4>
            <Link href="/auth?mode=sign-in" className="footer-link">Sign In</Link>
            <Link href="/auth?mode=sign-up" className="footer-link">Create Account</Link>
            <Link href="/dashboard/match" className="footer-link">Find Providers</Link>
            <Link href="/dashboard" className="footer-link">User Dashboard</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            &copy; {new Date().getFullYear()} Preve. All rights reserved.
          </div>
          <div className="footer-bottom-links">
            <Link href="/privacy" className="footer-bottom-link">Privacy Policy</Link>
            <Link href="/terms" className="footer-bottom-link">Terms of Service</Link>
            <Link href="/support" className="footer-bottom-link">♥ Support preve</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
