// components/ThemeToggle.tsx - PERFECT MOBILE DESIGN: Pill-shaped with contained toggle
"use client";

import { useContext, useEffect, useState } from "react";
import { ThemeProviderContext } from "@/components/providers/Providers";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { theme, setTheme } = useContext(ThemeProviderContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const checkDarkMode = () => {
      if (theme === "dark") {
        return true;
      }
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    };

    setIsDark(checkDarkMode());
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="w-14 h-7 sm:w-16 sm:h-8 bg-muted rounded-full animate-pulse" />
    );
  }

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      data-state={isDark ? "checked" : "unchecked"}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex h-7 w-14 sm:h-8 sm:w-16 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:opacity-90 active:scale-95",
        isDark 
          ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700" 
          : "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200"
      )}
    >
      {/* Toggle circle with icon - PERFECTLY CONTAINED */}
      <span
        className={cn(
          "pointer-events-none relative flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out",
          isDark 
            ? "translate-x-7 sm:translate-x-8" 
            : "translate-x-0"
        )}
      >
        {/* Icon with smooth cross-fade */}
        <Sun 
          className={cn(
            "absolute h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 transition-all duration-300",
            isDark 
              ? "rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon 
          className={cn(
            "absolute h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 transition-all duration-300",
            isDark 
              ? "rotate-0 scale-100 opacity-100" 
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </span>

      {/* Subtle stars for dark mode - CONTAINED INSIDE */}
      {isDark && (
        <>
          <span className="absolute top-2 left-2 h-0.5 w-0.5 rounded-full bg-white/60 animate-pulse" />
          <span className="absolute top-3.5 left-3.5 h-0.5 w-0.5 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <span className="absolute bottom-2 left-2.5 h-0.5 w-0.5 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0.6s' }} />
        </>
      )}
    </button>
  );
}