// components/ThemeToggle.tsx
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
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex h-7 w-14 sm:h-9 sm:w-16 shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:opacity-90 active:scale-95",
        isDark 
          ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 justify-end" 
          : "bg-gradient-to-br from-sky-400 via-sky-300 to-sky-400 justify-start"
      )}
    >
      <span
        className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out"
      >
        <Sun 
          className={cn(
            "absolute h-3 w-3 sm:h-4 sm:w-4 text-amber-500 transition-all duration-300 ease-in-out",
            isDark 
              ? "rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100"
          )}
        />
        <Moon 
          className={cn(
            "absolute h-3 w-3 sm:h-4 sm:w-4 text-indigo-900 transition-all duration-300 ease-in-out",
            isDark 
              ? "rotate-0 scale-100 opacity-100" 
              : "-rotate-90 scale-0 opacity-0"
          )}
        />
      </span>
      
      {isDark && (
        <>
          <span className="absolute left-3 top-2 sm:top-2.5 h-1 w-1 rounded-full bg-white/80 animate-pulse" />
          <span className="absolute left-4 top-3.5 sm:top-4 h-0.5 w-0.5 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
          <span className="absolute left-2.5 bottom-2 sm:bottom-2.5 h-0.5 w-0.5 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: '0.6s' }} />
        </>
      )}
    </button>
  );
}