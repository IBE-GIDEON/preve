"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, BookOpen, Search } from "lucide-react";
import { FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const DEMO_PROFILE_IMAGE_URL = "https://randomuser.me/api/portraits/men/32.jpg";

interface FeedItem {
  id: string;
  platform: "linkedin" | "x" | "reddit" | "medium";
  platformName: string;
  author: string;
  avatarColor: string;
  content: string;
  Icon: any;
  iconColor: string;
}

interface QueryCycle {
  query: string;
  results: FeedItem[];
}

const CYCLES: QueryCycle[] = [
  {
    query: "Where did I explain pricing psychology for creators?",
    results: [
      {
        id: "p1",
        platform: "linkedin",
        platformName: "LinkedIn",
        author: "Alex Rivers",
        avatarColor: "#0A66C2",
        content: "The best pricing page is not persuasive. It is clarifying. If your tier names make people think instead of click, you are losing conversions.",
        Icon: FaLinkedin,
        iconColor: "#0A66C2"
      },
      {
        id: "p2",
        platform: "reddit",
        platformName: "r/solopreneur",
        author: "u/arivers",
        avatarColor: "#FF4500",
        content: "Undercharging is a symptom of confusing affordability with trust. Creators think lowering prices will convince people. In reality, it just signals low quality.",
        Icon: MessageSquare,
        iconColor: "#FF4500"
      },
      {
        id: "p3",
        platform: "x",
        platformName: "X (Twitter)",
        author: "@arivers",
        avatarColor: "#000000",
        content: "Pricing Tip: People buy faster when the immediate next step feels smaller than the overall problem they are trying to solve.",
        Icon: FaXTwitter,
        iconColor: "var(--foreground)"
      }
    ]
  },
  {
    query: "My advice on building in public?",
    results: [
      {
        id: "b1",
        platform: "x",
        platformName: "X (Twitter)",
        author: "@arivers",
        avatarColor: "#000000",
        content: "We started sharing our revenue metrics on Day 1. It felt terrifying. But it built a level of loyalty that no marketing budget could ever buy.",
        Icon: FaXTwitter,
        iconColor: "var(--foreground)"
      },
      {
        id: "b2",
        platform: "linkedin",
        platformName: "LinkedIn",
        author: "Alex Rivers",
        avatarColor: "#0A66C2",
        content: "Building in public is not about showing off. It is about letting your users become co-designers of your product. Your transparency is their investment.",
        Icon: FaLinkedin,
        iconColor: "#0A66C2"
      }
    ]
  },
  {
    query: "What is my launch strategy checklist?",
    results: [
      {
        id: "l1",
        platform: "medium",
        platformName: "Medium",
        author: "Alex Rivers",
        avatarColor: "#00ab6c",
        content: "Product Hunt Checklist: 1. Launch at 12:01 AM PST to maximize time zone exposure. 2. Send personalized notes, not mass blasts. 3. Keep the first comment focused on the problem.",
        Icon: BookOpen,
        iconColor: "#00ab6c"
      },
      {
        id: "l2",
        platform: "linkedin",
        platformName: "LinkedIn",
        author: "Alex Rivers",
        avatarColor: "#0A66C2",
        content: "A product launch is won 30 days before the day. Stop optimizing your landing page and start cultivating genuine relationships with your early advocates.",
        Icon: FaLinkedin,
        iconColor: "#0A66C2"
      }
    ]
  }
];

export default function LiveFeedDemo() {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [step, setStep] = useState<"typing" | "searching" | "showing">("typing");
  const [visibleResults, setVisibleResults] = useState<FeedItem[]>([]);

  const currentCycle = CYCLES[cycleIndex];

  // Typing effect
  useEffect(() => {
    if (step !== "typing") return;

    let index = 0;
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    setTypedText("");
    setVisibleResults([]);

    const interval = setInterval(() => {
      setTypedText((prev) => prev + currentCycle.query.charAt(index));
      index++;

      if (index >= currentCycle.query.length) {
        clearInterval(interval);
        // Pause briefly after typing before searching
        searchTimer = setTimeout(() => {
          setStep("searching");
        }, 800);
      }
    }, 45); // Speed of typing

    return () => {
      clearInterval(interval);
      if (searchTimer) clearTimeout(searchTimer);
    };
  }, [cycleIndex, step]);

  // Loading / searching state transitions into showing items one by one
  useEffect(() => {
    if (step !== "searching") return;

    const timer = setTimeout(() => {
      setStep("showing");
    }, 1000); // How long the searching state/spinner lasts

    return () => clearTimeout(timer);
  }, [step]);

  // Show items sequentially (pop-up + sliding up feed)
  useEffect(() => {
    if (step !== "showing") return;

    const results = currentCycle.results;
    let resultIndex = 0;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      const nextResult = results[resultIndex];

      if (nextResult) {
        setVisibleResults((prev) => (
          prev.some((item) => item.id === nextResult.id) ? prev : [...prev, nextResult]
        ));
        resultIndex++;
        return;
      }

      clearInterval(interval);
      // Loop back to typing after showing results for a while
      restartTimer = setTimeout(() => {
        setStep("typing");
        setCycleIndex((prev) => (prev + 1) % CYCLES.length);
      }, 5000); // Time showing results before restarting cycle
    }, 1200); // Delay between each result appearing

    return () => {
      clearInterval(interval);
      if (restartTimer) clearTimeout(restartTimer);
    };
  }, [step, cycleIndex]);

  return (
    <div 
      className="live-feed-demo-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        background: "var(--input-bg)",
        border: "1px solid var(--input-border)",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05)",
        backdropFilter: "blur(20px)",
        width: "100%",
        maxWidth: "480px",
        height: "460px",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {/* Live Search Bar */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "rgba(0, 0, 0, 0.03)",
          border: "1px solid var(--input-border)",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          position: "relative"
        }}
      >
        <Search size={18} style={{ color: "var(--foreground)", opacity: 0.5, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: "0.95rem", fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {typedText}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{ display: "inline-block", width: "2px", height: "14px", background: "var(--foreground)", marginLeft: "2px", verticalAlign: "middle" }}
          />
        </div>

        {/* Searching Indicator */}
        <AnimatePresence>
          {step === "searching" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                y: "-50%",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "2px solid var(--input-border)",
                borderTopColor: "var(--foreground)",
              }}
              transition={{
                opacity: { duration: 0.12 },
                scale: { duration: 0.12 },
                rotate: { repeat: Infinity, ease: "linear", duration: 0.7 },
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Pop-up Scrolling Feed */}
      <div 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          gap: "1rem", 
          overflow: "hidden", 
          position: "relative",
          justifyContent: "flex-end" // Keep items sticking from the bottom
        }}
      >
        <AnimatePresence initial={false}>
          {visibleResults.filter(Boolean).map((item) => {
            const PlatformIcon = item.Icon || MessageSquare;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 14
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--input-border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.02)",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {/* Platform Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <img
                      src={DEMO_PROFILE_IMAGE_URL}
                      alt={`${item.author} profile`}
                      loading="lazy"
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border: `1px solid ${item.avatarColor}`,
                        display: "block",
                        flexShrink: 0,
                        objectFit: "cover",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{item.author}</span>
                      <span style={{ fontSize: "0.7rem", opacity: 0.5, color: "var(--foreground)" }}>{item.platformName}</span>
                    </div>
                  </div>
                  <PlatformIcon size={14} color={item.iconColor} />
                </div>

                {/* Content */}
                <p 
                  style={{ 
                    margin: 0, 
                    fontSize: "0.85rem", 
                    lineHeight: "1.4", 
                    color: "var(--foreground)", 
                    opacity: 0.9,
                    fontWeight: 400
                  }}
                >
                  {item.content}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
