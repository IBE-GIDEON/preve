"use client";

import { CardStack, CardItem } from "./ui/card-stack";
import { FaLinkedin, FaReddit } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export const Highlight = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="highlight-text">
      {children}
    </span>
  );
};

const CARDS: CardItem[] = [
  {
    id: 0,
    name: "Manu Arora",
    designation: "Creator of Aceternity",
    platform: "linkedin",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
        {/* Card Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" 
              alt="Manu Arora"
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)" }}>Manu Arora</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.5, color: "var(--foreground)" }}>Creator of Aceternity</span>
            </div>
          </div>
          <FaLinkedin size={16} color="#0A66C2" />
        </div>
        {/* Card Text */}
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.45", color: "var(--foreground)", opacity: 0.9, flex: 1 }}>
          These cards are amazing, <Highlight>I want to use them</Highlight> in my
          project. Framer motion is a godsend ngl tbh fam 🙏
        </p>
      </div>
    ),
  },
  {
    id: 1,
    name: "Elon Musk",
    designation: "Chief Shitposter @ X",
    platform: "x",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img 
              src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80" 
              alt="Elon Musk"
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)" }}>Elon Musk</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.5, color: "var(--foreground)" }}>Chief Shitposter @ X</span>
            </div>
          </div>
          <FaXTwitter size={16} color="var(--foreground)" />
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: "1.4", color: "var(--foreground)", opacity: 0.9, flex: 1 }}>
          I dont like this Twitter thing,{" "}
          <Highlight>deleting it right away</Highlight> because yolo. Instead, I
          would like to call it <Highlight>X.com</Highlight> so that it can easily
          be confused with adult sites.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    name: "Tyler Durden",
    designation: "Soap Maker & Rebel",
    platform: "reddit",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
              alt="Tyler Durden"
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)" }}>Tyler Durden</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.5, color: "var(--foreground)" }}>Soap Maker & Rebel</span>
            </div>
          </div>
          <FaReddit size={16} color="#FF4500" />
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: "1.45", color: "var(--foreground)", opacity: 0.9, flex: 1 }}>
          The first rule of <Highlight>Fight Club</Highlight> is that you do not talk about fight club. The second rule of <Highlight>Fight club</Highlight> is that you DO NOT TALK about fight club.
        </p>
      </div>
    ),
  },
];

export function CommunityCardStack() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "260px" }}>
      <CardStack items={CARDS} />
    </div>
  );
}
