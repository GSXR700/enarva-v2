// components/pdf/WaveLoader.tsx
'use client'

import React from 'react'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

interface WaveLoaderProps {
  isLoading: boolean
  documentTitle?: string
}

export function WaveLoader({ 
  isLoading,
  documentTitle = 'Télécharger votre document'
}: WaveLoaderProps) {
  if (!isLoading) return null

  return (
    <DialogPrimitive.Root open={isLoading}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "max-w-2xl w-full"
          )}
        >
          <div className="relative w-full h-[700px] rounded-lg overflow-hidden bg-white shadow-2xl">
            {/* Document Header - Blue with Enarva Logo */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#267df4] to-[#2155c9] h-24 flex items-center justify-end px-8 z-10">
              <div className="text-white text-4xl font-bold tracking-wider">
                enarva
              </div>
            </div>

            {/* Document Body with Skeleton Lines */}
            <div className="absolute top-24 left-0 right-0 bottom-0 bg-white p-8 overflow-hidden">
              <div className="space-y-4 animate-pulse">
                {/* Title Line */}
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                
                {/* Subtitle */}
                <div className="h-4 bg-gray-100 rounded w-1/3 mt-2"></div>
                
                <div className="mt-8 space-y-3">
                  {/* Content Lines */}
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-11/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-10/12"></div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-11/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-9/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-10/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-11/12"></div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-9/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                </div>

                {/* Table-like structure */}
                <div className="mt-12 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-11/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-10/12"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-8/12"></div>
                </div>
              </div>

              {/* Loading Text - Below the document */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-lg font-semibold text-gray-800">{documentTitle}</p>
                <p className="text-sm text-gray-500 mt-2">Préparation de votre document...</p>
              </div>
            </div>

            {/* Animated Wave Overlay - Starts from bottom */}
            <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none overflow-hidden">
              <div className="wave-loader-container">
                <div className="wave-svg-wrapper">
                  <svg className="wave-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.85)" />
                        <stop offset="100%" stopColor="rgba(37, 99, 235, 0.85)" />
                      </linearGradient>
                      <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(96, 165, 250, 0.7)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.7)" />
                      </linearGradient>
                      <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(147, 197, 253, 0.5)" />
                        <stop offset="100%" stopColor="rgba(96, 165, 250, 0.5)" />
                      </linearGradient>
                    </defs>
                    <path className="wave-path wave-1" fill="url(#wave-gradient-1)" d="M0,160 C320,100,420,140,740,140 C1060,140,1120,100,1440,160 L1440,320 L0,320 Z" />
                    <path className="wave-path wave-2" fill="url(#wave-gradient-2)" d="M0,200 C360,140,540,200,840,200 C1140,200,1260,140,1440,200 L1440,320 L0,320 Z" />
                    <path className="wave-path wave-3" fill="url(#wave-gradient-3)" d="M0,240 C400,180,640,240,940,240 C1240,240,1340,180,1440,240 L1440,320 L0,320 Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}