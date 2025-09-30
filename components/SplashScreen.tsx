// components/SplashScreen.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const hasShownRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkDarkMode = () => {
      if (theme === 'dark') return true;
      if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
      return false;
    };

    setIsDarkMode(checkDarkMode());
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isPWA = checkIfPWA();
    
    if (!isPWA && hasShownRef.current) return;
    if (sessionStorage.getItem('splash-shown') && !isPWA) return;

    hasShownRef.current = true;
    setIsVisible(true);
    
    if (!isPWA) {
      sessionStorage.setItem('splash-shown', 'true');
    }

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000); // 2 secondes

    return () => clearTimeout(hideTimer);
  }, []);

  const checkIfPWA = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInWebApk = document.referrer.includes('android-app://');
    
    return isStandalone || isIOSStandalone || isInWebApk;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ 
          opacity: 0,
          transition: { duration: 0.5, ease: "easeOut" }
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        style={{
          background: isDarkMode 
            ? '#000000'
            : 'linear-gradient(135deg, #267df4 0%, #2155c9 100%)'
        }}
      >
        {/* Animated Background Blobs - Only in Light Mode */}
        {!isDarkMode && (
          <>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-1/4 -left-1/4 h-96 w-96 rounded-full bg-white/20 blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
                x: [0, -40, 0],
                y: [0, 40, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute -bottom-1/4 -right-1/4 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
            />
          </>
        )}

        {/* Logo Only - No Progress Bar, No Shine Effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10"
        >
          <h1 
            className="text-white font-bold select-none text-center"
            style={{
              fontSize: 'clamp(80px, 18vw, 120px)', // Increased: 80px to 120px
              letterSpacing: '-2px',
              fontFamily: 'Poppins, sans-serif',
              textShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
              lineHeight: '1',
            }}
          >
            enarva
          </h1>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}