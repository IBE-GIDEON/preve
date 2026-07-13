"use client";

import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Database,
  Layers3,
  LogIn,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import FloatingIcons from "../components/FloatingIcons";
import LiveFeedDemo from "../components/LiveFeedDemo";
import { CommunityCardStack } from "../components/CommunityCardStack";
import { WhyItMattersCarousel } from "../components/WhyItMattersCarousel";
import { FaLinkedin, FaReddit } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

type Feature = {
  title: string;
  copy: string;
  Icon: LucideIcon;
  widgetId?: "connect" | "search" | "remix";
};

const ConnectWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <FaXTwitter size={14} color="var(--foreground)" />
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>@arivers</span>
      </div>
      <span style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} /> Connected
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <FaLinkedin size={14} color="#0A66C2" />
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Alex Rivers</span>
      </div>
      <span style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} /> Connected
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--input-border)', borderRadius: '8px', padding: '0.6rem 0.8rem', opacity: 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <FaReddit size={14} color="#FF4500" />
        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>r/solopreneur</span>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--foreground)' }}>Connect</span>
    </div>
  </div>
);

const SearchWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--input-border)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
      <Search size={12} style={{ opacity: 0.5 }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--foreground)' }}>"pricing advice"</span>
    </div>
    <div className="landing-mock-search-highlight" style={{ paddingLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <FaLinkedin size={10} color="#0A66C2" />
        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Alex Rivers &bull; 3m ago</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.4, color: 'var(--foreground)', opacity: 0.9 }}>
        "The best pricing page is not persuasive. It is clarifying..."
      </p>
      <span className="landing-mock-search-tag">
        98% Semantic Match
      </span>
    </div>
  </div>
);

const RemixWidget = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', padding: '1.25rem', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.6, borderBottom: '1px solid var(--input-border)', paddingBottom: '0.4rem' }}>
      <span>Drafting: Newsletter Issue #42</span>
      <span className="landing-mock-remix-status">Remixing...</span>
    </div>
    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--input-border)', borderRadius: '6px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', border: '1px solid var(--input-border)' }}>Source: LinkedIn Post</span>
      <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--foreground)', opacity: 0.75, fontStyle: 'italic' }}>
        "I was thinking about how solo founders price their work..."
      </p>
    </div>
    <div className="landing-mock-remix-button">
      <Layers3 size={12} /> Compile Newsletter Draft
    </div>
  </div>
);

const workflow: Feature[] = [
  {
    title: "Connect your public voice",
    copy: "Bring in the places where your best thinking already lives, then let Preve organize it around topics, people, and intent.",
    Icon: Database,
    widgetId: "connect"
  },
  {
    title: "Search by meaning",
    copy: "Find the idea you remember, even when you do not remember the exact words, date, platform, or thread.",
    Icon: Search,
    widgetId: "search"
  },
  {
    title: "Remix into new work",
    copy: "Turn old posts into sharper drafts, launch notes, client replies, articles, scripts, and reusable collections.",
    Icon: Layers3,
    widgetId: "remix"
  },
];

const specifications = [
  {
    number: "01",
    title: "Private Index",
    copy: "All indexed posts, search queries, and credentials are stored securely client-side. We do not sell tracking data or train LLMs on your writing."
  },
  {
    number: "02",
    title: "Contextual Threading",
    copy: "Preve doesn't just pull isolated posts. We reconstruct complete parent threads, conversation timelines, and linked resources so your original meaning is kept intact."
  },
  {
    number: "03",
    title: "High-Speed Queries",
    copy: "Optimized database indices query 10,000+ posts in under 80ms. The interface reacts instantly, feeling more like desktop software than a web browser app."
  },
  {
    number: "04",
    title: "Draft Compilation",
    copy: "Select multiple search items and compile them directly into clean, portable Markdown drafts. Send them to your newsletter or project docs with a single keystroke."
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

        {/* Floating Icons stay contained STRICTLY within the hero section */}
        <FloatingIcons />

        <header className="legacy-landing-header" style={{ position: 'relative', zIndex: 10 }}>
          <div className="logo" style={{ marginBottom: 0 }}>
            <img src="/images/preve-search-mark.svg" alt="" className="logo-mark" />
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
            <h1 id="legacy-hero-title">Search Everything You&apos;ve Ever Posted</h1>
            <p>
              The gallery for your words. Find, reuse, and organize your content across all platforms instantly.
            </p>

            <Link href="/auth?next=/onboarding" className="legacy-landing-link">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="legacy-landing-button">
                <LogIn size={24} />
                Sign in to Start
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
            <h2>We are building the memory layer for people who publish their thinking.</h2>
            <p>
              Preve is for creators, founders, operators, researchers, and builders who have already written thousands of useful things online. We help you recover the ideas worth keeping, understand why they worked, and turn them into stronger future work.
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
            <LiveFeedDemo />
          </motion.div>
        </section>

        <section id="workflow" className="landing-section landing-workflow">
          <div className="landing-section-heading">
            <span className="landing-section-label">What we do</span>
            <h2>Preve turns scattered social history into a working knowledge system.</h2>
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
                  {widgetId === "connect" && <ConnectWidget />}
                  {widgetId === "search" && <SearchWidget />}
                  {widgetId === "remix" && <RemixWidget />}
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

        <section id="community" className="landing-section landing-community">
          <motion.div
            className="landing-community-demo"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55 }}
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div style={{ width: "100%", maxWidth: "400px", display: "flex", justifyContent: "center" }}>
              <CommunityCardStack />
            </div>
          </motion.div>

          <motion.div
            className="landing-section-copy"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="landing-section-label">Community</span>
            <h2>Connect with the minds you respect.</h2>
            <p>
              Preve indexes and connects the public knowledge bases of top builders, writers, and operators. Search across overlapping interests, check aggregate opinions on topics you care about, and see what other creators think.
            </p>
          </motion.div>
        </section>

        <section id="why-it-matters" className="landing-section landing-insights" style={{ paddingBottom: "2rem" }}>
          <div className="landing-section-heading narrow" style={{ marginBottom: 0 }}>
            <span className="landing-section-label">Why it matters</span>
            <h2>Your archive is already full of product insight, audience language, and proof.</h2>
          </div>
          <WhyItMattersCarousel />
        </section>

        <section id="trust" className="landing-section landing-capabilities">
          <div className="landing-specs-container">
            <div className="landing-specs-copy">
              <span className="landing-section-label">Specifications</span>
              <h2>Built for the long term.</h2>
              <p>
                Preve does not train LLMs on your historical posts, sell search logs, or inject advertisements. We design high-speed personal indexing systems that respect your data and privacy.
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
            <span className="landing-section-label">Start with your archive</span>
            <h2>Bring your best thinking back into reach.</h2>
            <p style={{ maxWidth: "520px", margin: "0 auto 1.5rem", fontSize: "1.05rem", opacity: 0.85, lineHeight: 1.6 }}>
              Connect your platforms, index your conversation history, and reuse your public knowledge instantly.
            </p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
              <Link href="/auth?next=/onboarding" className="landing-primary-cta" style={{ display: "inline-flex", gap: "0.5rem", borderRadius: "100px", padding: "0.9rem 2.25rem", alignItems: "center" }}>
                <span>Get started instantly</span>
                <ArrowRight size={18} />
              </Link>
              <span style={{ fontSize: "0.75rem", opacity: 0.5, fontStyle: "italic" }}>
                No credit card required &bull; Free indexing up to 1,000 posts
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-brand">
            <div className="logo">
              <img src="/images/preve-search-mark.svg" alt="" className="logo-mark" />
              <span>preve</span>
            </div>
            <p>
              Your private archive and connected social sources. Organized around topics, search, and meaning.
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
            <Link href="#workflow" className="footer-link">Connect Voice</Link>
            <Link href="#workflow" className="footer-link">Search by Meaning</Link>
            <Link href="#workflow" className="footer-link">Remixing Engine</Link>
            <Link href="#trust" className="footer-link">Specifications</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Resources</h4>
            <Link href="#community" className="footer-link">Community</Link>
            <Link href="#why-it-matters" className="footer-link">Why It Matters</Link>
            <Link href="/security" className="footer-link">Security Policy</Link>
          </div>

          <div className="footer-column">
            <h4 className="footer-title">Access</h4>
            <Link href="/auth?mode=sign-in" className="footer-link">Sign In</Link>
            <Link href="/auth?mode=sign-up" className="footer-link">Create Account</Link>
            <Link href="/onboarding" className="footer-link">Onboarding Setup</Link>
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
          </div>
        </div>
      </footer>
    </div>
  );
}
