"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { 
  FaInstagram, 
  FaLinkedin, 
  FaYoutube, 
  FaReddit, 
  FaFacebook, 
  FaTiktok, 
  FaPinterest, 
  FaMedium, 
  FaTwitch, 
  FaDiscord 
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const ICONS = [
  { name: "Instagram", Component: FaInstagram, color: "#E1306C" },
  { name: "LinkedIn", Component: FaLinkedin, color: "#0A66C2" },
  { name: "X", Component: FaXTwitter, color: "var(--foreground)" },
  { name: "YouTube", Component: FaYoutube, color: "#FF0000" },
  { name: "Reddit", Component: FaReddit, color: "#FF4500" },
  { name: "Facebook", Component: FaFacebook, color: "#1877F2" },
  { name: "TikTok", Component: FaTiktok, color: "#000000" }, 
  { name: "Pinterest", Component: FaPinterest, color: "#E60023" },
  { name: "Medium", Component: FaMedium, color: "#000000" },
  { name: "Twitch", Component: FaTwitch, color: "#9146FF" },
  { name: "Discord", Component: FaDiscord, color: "#5865F2" }
];

// Seeded deterministic values to prevent Next.js hydration mismatch errors
const SEEDED_OFFSETS = [
  { radiusX: 27, radiusY: 18, duration: 9.5 },
  { radiusX: 39, radiusY: 26, duration: 13.0 },
  { radiusX: 42, radiusY: 15, duration: 11.2 },
  { radiusX: 31, radiusY: 32, duration: 15.8 },
  { radiusX: 45, radiusY: 23, duration: 10.6 },
  { radiusX: 29, radiusY: 34, duration: 12.4 },
  { radiusX: 40, radiusY: 19, duration: 14.1 },
  { radiusX: 35, radiusY: 28, duration: 16.3 },
  { radiusX: 26, radiusY: 21, duration: 9.9 },
  { radiusX: 44, radiusY: 30, duration: 11.7 },
  { radiusX: 33, radiusY: 25, duration: 13.5 },
];

type PointerState = {
  x: number;
  y: number;
  active: boolean;
};

export default function FloatingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [pointer, setPointer] = useState<PointerState>({ x: 50, y: 50, active: false });

  useEffect(() => {
    let animationFrameId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const bounds = containerRef.current?.getBoundingClientRect();
        if (!bounds) return;

        const isInside =
          e.clientX >= bounds.left &&
          e.clientX <= bounds.right &&
          e.clientY >= bounds.top &&
          e.clientY <= bounds.bottom;

        if (!isInside) {
          setPointer((current) => (current.active ? { ...current, active: false } : current));
          return;
        }

        setPointer({
          x: ((e.clientX - bounds.left) / bounds.width) * 100,
          y: ((e.clientY - bounds.top) / bounds.height) * 100,
          active: true,
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="floating-icons-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    >
      {ICONS.map((icon, index) => {
        // Spread 11 icons widely across the container using seeded values
        const angle = (index / ICONS.length) * Math.PI * 2;
        const seed = SEEDED_OFFSETS[index % SEEDED_OFFSETS.length];

        const baseX = Math.min(92, Math.max(8, 50 + Math.cos(angle) * seed.radiusX));
        const baseY = Math.min(86, Math.max(14, 50 + Math.sin(angle) * seed.radiusY));
        const distance = Math.hypot(pointer.x - baseX, pointer.y - baseY);
        const proximity = pointer.active ? Math.max(0, 1 - distance / 28) : 0;
        
        // Slower float duration
        const floatDuration = seed.duration;
        
        const direction = index % 2 === 0 ? 1 : -1;
        const parallaxX = pointer.active ? ((pointer.x - 50) / 50) * direction * (5 + proximity * 6) : 0;
        const parallaxY = pointer.active ? ((pointer.y - 50) / 50) * -direction * (3 + proximity * 5) : 0;
        const hoverLift = proximity * -14;
        const hoverTilt = proximity * direction * 8;
        const hoverScale = 1 + proximity * 0.12;
        const yTransition = reduceMotion
          ? ({ type: "spring", stiffness: 60, damping: 24, mass: 1 } as const)
          : {
              duration: floatDuration,
              repeat: Infinity,
              ease: "easeInOut",
            } as const;

        return (
          <motion.div
            key={icon.name}
            className={`floating-social-icon floating-social-icon-${index}`}
            style={{
              position: 'absolute',
              left: `${baseX}%`,
              top: `${baseY}%`,
              pointerEvents: 'auto',
              cursor: 'default',
              opacity: 0.92,
              marginLeft: -22,
              marginTop: -22,
            }}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{
              opacity: 0.92 + proximity * 0.08,
              scale: hoverScale,
              rotate: hoverTilt,
              x: parallaxX,
              y: reduceMotion ? hoverLift + parallaxY : [
                hoverLift + parallaxY,
                hoverLift + parallaxY - 12 - proximity * 8,
                hoverLift + parallaxY,
              ],
            }}
            transition={{
              opacity: { duration: 0.2 },
              scale: { type: "spring", stiffness: 120, damping: 18, mass: 0.8 },
              rotate: { type: "spring", stiffness: 90, damping: 20, mass: 0.9 },
              y: yTransition,
              x: {
                type: "spring",
                stiffness: 34,
                damping: 26,
                mass: 1.3,
              },
            }}
          >
            {/* Nested wrapper for realistic "water bubble" physics on direct hover */}
            <motion.div
              className="floating-social-icon-shell"
              whileHover={{ 
                scale: 1.18,
                y: -7,
                rotate: direction * 7,
                filter: "drop-shadow(0 14px 22px rgba(0, 0, 0, 0.16))",
              }}
              transition={{
                type: "spring",
                stiffness: 130,
                damping: 12,
                mass: 0.8,
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                filter: proximity > 0 ? "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.1))" : "none",
              }}
            >
              <icon.Component size={44} color={icon.color} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
