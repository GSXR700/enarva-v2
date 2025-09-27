//app/loading.tsx
'use client';

import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background transition-colors duration-300">
      <div className="relative w-48 h-16 animate-pulse">
        <Image
          src="/images/light-logo.png"
          alt="Enarva Logo"
          width={192}
          height={64}
          priority
          className="object-contain"
        />
        {/* Water flooding effect with theme support */}
        <div
          className="absolute bottom-0 left-0 right-0 h-full bg-primary/30 mix-blend-screen animate-flood dark:mix-blend-plus-lighter"
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
          animation: flood 1.5s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}