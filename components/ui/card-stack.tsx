"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

export type CardItem = {
  id: number;
  name: string;
  designation: string;
  content: React.ReactNode;
  avatar?: string;
  platform?: "x" | "linkedin" | "reddit";
};

export function CardStack({
  items,
  offset = 10,
  scaleFactor = 0.06,
}: {
  items: CardItem[];
  offset?: number;
  scaleFactor?: number;
}) {
  const [cards, setCards] = useState<CardItem[]>(items);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Keep internal state updated if items prop changes
    setCards(items);
  }, [items]);

  const startFlipping = () => {
    intervalRef.current = setInterval(() => {
      setCards((prevCards: CardItem[]) => {
        const newArray = [...prevCards];
        const firstItem = newArray.shift(); // Remove the top card
        if (firstItem) {
          newArray.push(firstItem); // Move it to the bottom
        }
        return newArray;
      });
    }, 4500); // Cycle every 4.5 seconds
  };

  useEffect(() => {
    startFlipping();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div 
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "400px",
        height: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {cards.map((card, index) => {
        // Only render the top 3 cards for performance and visual clarity
        if (index > 2) return null;

        return (
          <motion.div
            key={card.id}
            style={{
              position: "absolute",
              width: "100%",
              height: "220px",
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderRadius: "16px",
              padding: "1.25rem",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04), 0 2px 5px rgba(0, 0, 0, 0.02)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transformOrigin: "top center",
              zIndex: cards.length - index, // Top card has highest z-index
              boxSizing: "border-box"
            }}
            animate={{
              top: index * -offset, // Shift stacked cards upward
              scale: 1 - index * scaleFactor, // Shrink stacked cards slightly
            }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 18
            }}
          >
            {card.content}
          </motion.div>
        );
      })}
    </div>
  );
}
