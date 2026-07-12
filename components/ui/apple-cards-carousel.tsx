"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

interface Card {
  category: string;
  title: string;
  src: string;
  content: React.ReactNode;
}

export function Carousel({ items }: { items: React.ReactNode[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const { clientWidth } = carouselRef.current;
      const scrollAmount = clientWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 500); // Recheck after smooth scroll finishes
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Scroll controls */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: "0.75rem", 
          paddingRight: "2rem",
          marginBottom: "1rem"
        }}
      >
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canScrollLeft ? "pointer" : "not-allowed",
            opacity: canScrollLeft ? 1 : 0.4,
            color: "var(--foreground)",
            transition: "all 0.2s"
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canScrollRight ? "pointer" : "not-allowed",
            opacity: canScrollRight ? 1 : 0.4,
            color: "var(--foreground)",
            transition: "all 0.2s"
          }}
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={carouselRef}
        onScroll={checkScroll}
        style={{
          display: "flex",
          gap: "1.5rem",
          overflowX: "auto",
          scrollBehavior: "smooth",
          padding: "1rem 2rem 2.5rem",
          scrollbarWidth: "none", // Firefox
          WebkitOverflowScrolling: "touch"
        }}
        className="hide-scrollbar"
      >
        {items.map((item, index) => (
          <div 
            key={index}
            style={{ 
              flexShrink: 0,
              width: "280px"
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export function Card({ card, index }: { card: Card; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Small Card */}
      <motion.div
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        style={{
          height: "380px",
          borderRadius: "24px",
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.03)"
        }}
      >
        {/* Background Image */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img
            src={card.src}
            alt={card.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Bottom Dark Gradient overlay for title readability */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* Content Overlay */}
        <div style={{ position: "relative", zIndex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <span 
            style={{ 
              fontSize: "0.75rem", 
              fontWeight: 700, 
              color: "rgba(255,255,255,0.7)", 
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}
          >
            {card.category}
          </span>
          <h3 
            style={{ 
              margin: 0, 
              fontSize: "1.25rem", 
              fontWeight: 700, 
              color: "#ffffff", 
              lineHeight: 1.25,
              textShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}
          >
            {card.title}
          </h3>
        </div>
      </motion.div>

      {/* Modal Detail view */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
              boxSizing: "border-box"
            }}
          >
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(8px)",
              }}
            />

            {/* Modal Body Container */}
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              style={{
                position: "relative",
                background: "var(--background)",
                border: "1px solid var(--input-border)",
                width: "100%",
                maxWidth: "680px",
                maxHeight: "85vh",
                borderRadius: "28px",
                overflowY: "auto",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                zIndex: 101,
                boxSizing: "border-box"
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: "absolute",
                  right: "1.5rem",
                  top: "1.5rem",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  color: "var(--foreground)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 102
                }}
              >
                <X size={16} />
              </button>

              {/* Modal Image Header */}
              <div style={{ width: "100%", height: "260px", position: "relative" }}>
                <img
                  src={card.src}
                  alt={card.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Modal Contents */}
              <div style={{ padding: "2rem" }}>
                <span 
                  style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: 700, 
                    color: "color-mix(in srgb, var(--foreground) 50%, transparent)", 
                    textTransform: "uppercase", 
                    letterSpacing: "0.08em",
                    display: "block",
                    marginBottom: "0.5rem"
                  }}
                >
                  {card.category}
                </span>
                <h2 
                  style={{ 
                    margin: "0 0 1.5rem 0", 
                    fontSize: "1.85rem", 
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontWeight: 500,
                    lineHeight: 1.2,
                    color: "var(--foreground)"
                  }}
                >
                  {card.title}
                </h2>
                <div style={{ fontSize: "1rem", lineHeight: "1.6", color: "var(--foreground)", opacity: 0.9 }}>
                  {card.content}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
