// components/SplashScreen.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

// Type extension for iOS Safari
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const hasShownRef = useRef(false);
  const { theme } = useTheme();

  // Determine dark mode on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkDarkMode = () => {
      if (theme === 'dark') {
        return true;
      } else if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    };

    setIsDarkMode(checkDarkMode());
  }, [theme]);

  useEffect(() => {
    // Ensure we're on the client
    if (typeof window === 'undefined') return;

    // Check if this is a PWA launch
    const isPWA = checkIfPWA();
    
    // Only show splash screen for PWA launches or first visit
    if (!isPWA && hasShownRef.current) {
      return;
    }

    // Prevent showing multiple times in same session
    if (sessionStorage.getItem('splash-shown') && !isPWA) {
      return;
    }

    hasShownRef.current = true;
    setIsVisible(true);
    
    // Mark as shown in this session
    if (!isPWA) {
      sessionStorage.setItem('splash-shown', 'true');
    }

    // Start logo animation immediately
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 100);

    // Simulate app loading with smooth progress
    const duration = 2000; // 2 seconds loading
    const steps = 50;
    const interval = duration / steps;

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / steps);
      });
    }, interval);

    // Hide splash screen after loading
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration + 500);

    // Cleanup
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(hideTimer);
      clearInterval(progressInterval);
    };
  }, []);

  const checkIfPWA = (): boolean => {
    // Client-side check only
    if (typeof window === 'undefined') return false;
    
    // Check if app was launched from home screen
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
          clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
          transition: { 
            duration: 0.8, 
            ease: [0.76, 0, 0.24, 1],
            clipPath: { duration: 1, ease: [0.76, 0, 0.24, 1] }
          }
        }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: isDarkMode 
            ? '#000000'
            : 'linear-gradient(to right, #267df4, #2155c9)'
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
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, 30, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
            />
          </>
        )}

        {/* Text-Based Logo - HD Quality, matching PDF styling */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ 
                scale: 0.9,
                opacity: 0,
                transition: { duration: 0.5 }
              }}
              transition={{ 
                duration: 0.6,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
              className="relative mb-12 z-10"
            >
              {/* Text-based "enarva" logo - Always white, HD quality */}
              <div className="relative flex items-center justify-center">
                <h1 
                  className="text-white font-bold select-none"
                  style={{
                    fontSize: '160px',
                    letterSpacing: '-2px',
                    fontFamily: 'Poppins, sans-serif',
                    textShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    lineHeight: '1',
                  }}
                >
                  enarva
                </h1>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apple-style Progress Bar */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-64 md:w-80 z-10"
            >
              {/* Progress Bar Container */}
              <div className={`w-full h-1 rounded-full overflow-hidden transition-colors duration-300 ${
                isDarkMode ? 'bg-white/10' : 'bg-white/20'
              }`}>
                {/* Progress Bar - animates from left to right (0% to 100% width) */}
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full transition-colors duration-300 bg-white"
                  style={{
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}