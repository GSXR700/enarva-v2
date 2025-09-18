// components/SplashScreen.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
  const hasShownRef = useRef(false);

  useEffect(() => {
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

    // Simulate app loading with realistic progress
    const steps = [
      { progress: 20, delay: 300 },
      { progress: 40, delay: 600 },
      { progress: 60, delay: 900 },
      { progress: 80, delay: 1200 },
      { progress: 100, delay: 1500 }
    ];

    const timers: NodeJS.Timeout[] = [];

    steps.forEach(({ progress, delay }) => {
      const timer = setTimeout(() => {
        setLoadingProgress(progress);
      }, delay);
      timers.push(timer);
    });

    // Hide splash screen after loading
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(hideTimer);
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const checkIfPWA = (): boolean => {
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
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center"
        style={{
          background: `
            linear-gradient(135deg, 
              #f8fafc 0%, 
              #ffffff 50%, 
              #f1f5f9 100%
            )
          `
        }}
      >
        {/* Logo Container */}
        <div className="relative flex flex-col items-center">
          {/* Main Logo */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.8,
                  ease: [0.43, 0.13, 0.23, 0.96]
                }}
                className="relative mb-8"
              >
                {/* Logo with glow effect */}
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse"></div>
                  <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl">
                    <Image
                      src="/images/enarva-logo.png"
                      alt="Enarva"
                      fill
                      priority
                      className="object-contain p-4"
                      quality={100}
                    />
                  </div>
                  
                  {/* Animated rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-blue-200 animate-ping"></div>
                  <div 
                    className="absolute inset-0 rounded-full border border-blue-300"
                    style={{
                      animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                      animationDelay: '0.5s'
                    }}
                  ></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* App Name */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                  Enarva OS
                </h1>
                <p className="text-gray-500 text-sm md:text-base">
                  Système de Gestion Professionnel
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Progress */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="w-64 md:w-80"
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Chargement</span>
                    <span className="text-sm text-blue-600 font-medium">
                      {loadingProgress}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full relative"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    </motion.div>
                  </div>
                </div>

                {/* Loading Text */}
                <div className="text-center">
                  <motion.p
                    key={loadingProgress}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-gray-400"
                  >
                    {getLoadingText(loadingProgress)}
                  </motion.p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                }}
                animate={{ 
                  opacity: [0, 0.3, 0],
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: Math.random() * 2
                }}
                className="absolute w-2 h-2 bg-blue-300/30 rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Custom styles for animations */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          .animate-shimmer {
            animation: shimmer 1.5s infinite;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

function getLoadingText(progress: number): string {
  if (progress <= 20) return "Initialisation...";
  if (progress <= 40) return "Chargement des ressources...";
  if (progress <= 60) return "Configuration de l'interface...";
  if (progress <= 80) return "Finalisation...";
  return "Prêt !";
}