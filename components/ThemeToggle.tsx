// components/ThemeToggle.tsx - FIXED WITHOUT WARNINGS
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme(); // Removed unused 'theme'
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-14 h-7 sm:w-16 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
    );
  }

  // Use resolvedTheme to get the actual current theme
  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="relative w-14 h-7 sm:w-16 sm:h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full p-1 transition-all duration-300 ease-in-out hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      {/* Background with stars effect for dark mode */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        {isDark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900"
          >
            {/* Animated stars */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-0.5 h-0.5 bg-white rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Toggle circle with icon */}
      <motion.div
        className="relative w-5 h-5 sm:w-6 sm:h-6 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center z-10"
        animate={{
          x: isDark ? "calc(100% + 0.25rem)" : "0%",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        <motion.div
          key={isDark ? "dark" : "light"}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? (
            <Moon className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
          ) : (
            <Sun className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
          )}
        </motion.div>
      </motion.div>
    </button>
  );
}