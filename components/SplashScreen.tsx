// components/SplashScreen.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-300 ${
          isDarkMode ? 'bg-black' : 'bg-white'
        }`}
      >
        {/* Logo Container */}
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
              className="relative mb-12"
            >
              {/* Logo with shine effect */}
              <div className="relative w-80 h-24 md:w-96 md:h-28">
                <Image
                  src="/images/dark-logo.png"
                  alt="Enarva"
                  fill
                  priority
                  className="object-contain"
                  quality={100}
                />
                
                {/* Shine effect overlay - sweeps from E to A */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "linear"
                  }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <div 
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{
                      filter: 'blur(10px)',
                      transform: 'skewX(-20deg)'
                    }}
                  />
                </motion.div>
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
              className="w-64 md:w-80"
            >
              {/* Progress Bar Container */}
              <div className={`w-full h-1 rounded-full overflow-hidden transition-colors duration-300 ${
                isDarkMode ? 'bg-white/10' : 'bg-gray-200'
              }`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`h-full rounded-full transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-white' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  }`}
                  style={{
                    boxShadow: isDarkMode 
                      ? '0 0 10px rgba(255, 255, 255, 0.5)' 
                      : '0 0 10px rgba(59, 130, 246, 0.5)'
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom styles for shine animation */}
        <style jsx>{`
          @keyframes shine {
            0% { transform: translateX(-100%) skewX(-20deg); }
            100% { transform: translateX(100%) skewX(-20deg); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}