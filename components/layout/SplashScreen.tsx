//components/layout/SplashScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3500); // Display for 3.5 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="relative w-56 h-20">
        <Image
          src="/images/light-logo.png"
          alt="Enarva Logo"
          width={230}
          height={77}
          priority
          className="object-contain"
        />
        {/* Water flooding effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-full bg-blue-600/30 mix-blend-screen animate-flood"
        />
      </div>
      <style jsx>{`
        @keyframes flood {
          0% {
            height: 0%;
          }
          100% {
            height: 100%;
          }
        }
        .animate-flood {
          animation: flood 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}