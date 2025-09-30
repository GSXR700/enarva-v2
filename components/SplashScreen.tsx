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

        {/* Main Content Container - Properly Centered with Margins */}
        <div className="flex flex-col items-center justify-center px-8 w-full max-w-md">
          
          {/* Text-Based Logo - Professional Size like Standard Apps */}
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
                className="relative z-10 mb-16"
              >
                {/* Text-based "enarva" logo - Properly sized */}
                <h1 
                  className="text-white font-bold select-none text-center"
                  style={{
                    fontSize: 'clamp(48px, 12vw, 72px)', // Responsive: 48px to 72px max
                    letterSpacing: '-1.5px',
                    fontFamily: 'Poppins, sans-serif',
                    textShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    lineHeight: '1',
                  }}
                >
                  enarva
                </h1>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar Container - Fixed at Bottom with Proper Margins */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="fixed bottom-16 left-0 right-0 px-8 w-full z-10"
              >
                {/* Progress Bar Background - Full Width */}
                <div className="max-w-md mx-auto">
                  <div className={`w-full h-1 rounded-full overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? 'bg-white/10' : 'bg-white/20'
                  }`}>
                    {/* Progress Bar Fill - Animates from 0% to 100% (left to right) */}
                    <motion.div
                      className="h-full rounded-full transition-colors duration-300 bg-white"
                      style={{
                        width: `${loadingProgress}%`,
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                        transformOrigin: 'left' // CRITICAL: Ensures it grows from left
                      }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${loadingProgress}%` }}
                      transition={{ 
                        duration: 0.1, 
                        ease: "linear" // Linear for smooth continuous progress
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}