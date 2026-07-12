"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = [
  "Find my best-performing posts",
  "Search everything I've ever written",
  "Find an old Reddit comment",
  "Show my most viral content",
  "What have I posted about AI?",
  "Find every mention of Stripe",
  "Organize my posts by topic",
  "Show my startup ideas",
  "Find duplicate content",
  "Turn my Reddit posts into LinkedIn posts",
  "Summarize my thoughts on React",
  "Find posts worth reposting",
  "Show my unanswered comments",
  "Find posts from last year",
  "What topics do I write about most?",
  "Search across every connected platform",
  "Group similar posts together",
  "Find my highest-engagement discussions",
  "Turn my posts into a blog article",
  "Show hidden content gems"
];

export default function SearchSection() {
  const [searchValue, setSearchValue] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ticker effect
  useEffect(() => {
    // Only run ticker if search is empty
    if (searchValue !== "") return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [searchValue]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchValue(suggestion);
    inputRef.current?.focus();
  };

  // Get exactly 3 visible suggestions, wrapping around if needed
  const visibleSuggestions = [];
  for (let i = 0; i < 3; i++) {
    visibleSuggestions.push(SUGGESTIONS[(currentIndex + i) % SUGGESTIONS.length]);
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Search Bar Wrapper */}
      <div className="search-wrapper">
        <input 
          ref={inputRef}
          type="search" 
          placeholder="Find anything" 
          className="search-input-animated"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Suggestions Section */}
      <AnimatePresence>
        {searchValue === "" && (
          <motion.div 
            className="suggestions-container"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="suggestions-heading">Try asking</h3>
            
            <div className="chat-bubble-container">
              <AnimatePresence mode="popLayout">
                {visibleSuggestions.map((suggestion) => (
                  <motion.div
                    layout
                    key={suggestion}
                    className="chat-suggestion-row"
                    onClick={() => handleSuggestionClick(suggestion)}
                    initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -20, filter: "blur(4px)", transition: { duration: 0.3 } }}
                    transition={{ 
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {suggestion}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
