// components/SplashScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Type extension for iOS Safari
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Check if app was launched from home screen
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone || isStandalone;

    // Only show splash screen for PWA mode
    if (!isPWA) {
      setIsVisible(false);
      return;
    }

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsVisible(false), 500);
          return 100;
        }
        return prev + 20;
      });
    }, 300);

    // Cleanup
    return () => clearInterval(progressInterval);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center"
        >
          {/* Logo avec animation d'eau */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.7,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="relative"
          >
            {/* Logo principal */}
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              <Image
                src="/images/enarva-logo.png"
                alt="Enarva"
                fill
                priority
                className="object-contain drop-shadow-xl"
                quality={100}
              />
              
              {/* Effet d'eau animé circulaire */}
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: [0.8, 1.1, 0.8],
                  opacity: [0, 0.3, 0]
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
                style={{
                  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />
              
              {/* Gouttes d'eau animées */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ 
                    top: '50%',
                    left: '50%',
                    scale: 0,
                    x: '-50%',
                    y: '-50%'
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 0.6, 0],
                    x: `${(Math.random() - 0.5) * 200}%`,
                    y: `${(Math.random() - 0.5) * 200}%`,
                  }}
                  transition={{
                    duration: 2.5,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                >
                  <div 
                    className="w-3 h-3 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full"
                    style={{
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Texte de l'entreprise */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 text-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Enarva OS
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base font-light">
              Excellence en nettoyage professionnel
            </p>
          </motion.div>

          {/* Barre de progression élégante */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 w-64 md:w-80"
          >
            <div className="relative">
              {/* Background de la barre */}
              <div className="h-1.5 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm">
                {/* Progression principale */}
                <motion.div
                  className="h-full relative overflow-hidden rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Gradient animé */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </div>
                </motion.div>
              </div>
              
              {/* Indicateur de pourcentage */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-3 flex items-center justify-center gap-2"
              >
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.2,
                        delay: i * 0.2,
                        repeat: Infinity
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  {loadingProgress}%
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Animation de vagues fluides en bas */}
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
            <svg
              className="w-full h-24 md:h-32"
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              {/* Première vague */}
              <motion.path
                d="M0,64 C360,96 720,32 1440,64 L1440,120 L0,120 Z"
                fill="url(#gradient-wave-1)"
                initial={{ d: "M0,64 C360,96 720,32 1440,64 L1440,120 L0,120 Z" }}
                animate={{ 
                  d: [
                    "M0,64 C360,96 720,32 1440,64 L1440,120 L0,120 Z",
                    "M0,32 C360,64 720,96 1440,32 L1440,120 L0,120 Z",
                    "M0,64 C360,96 720,32 1440,64 L1440,120 L0,120 Z"
                  ]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Deuxième vague */}
              <motion.path
                d="M0,48 C480,80 960,16 1440,48 L1440,120 L0,120 Z"
                fill="url(#gradient-wave-2)"
                initial={{ d: "M0,48 C480,80 960,16 1440,48 L1440,120 L0,120 Z" }}
                animate={{ 
                  d: [
                    "M0,48 C480,80 960,16 1440,48 L1440,120 L0,120 Z",
                    "M0,16 C480,48 960,80 1440,16 L1440,120 L0,120 Z",
                    "M0,48 C480,80 960,16 1440,48 L1440,120 L0,120 Z"
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />
              
              <defs>
                <linearGradient id="gradient-wave-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                  <stop offset="50%" stopColor="#2563EB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="gradient-wave-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#0891B2" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0E7490" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Copyright discret */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 text-xs text-gray-400"
          >
            © 2025 Enarva. Tous droits réservés.
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}