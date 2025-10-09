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
            "max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-2xl w-full"
          )}
        >
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden bg-white shadow-xl">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="relative w-full max-w-md aspect-[8.5/11] bg-white shadow-2xl rounded-lg overflow-hidden border-2 border-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4 p-8">
                      <div className="flex items-center justify-center mb-8">
                        <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
                          <span className="text-4xl font-bold text-white">E</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-blue-100 rounded w-3/4 mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6 mx-auto"></div>
                      </div>
                      <div className="space-y-2 mt-8">
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-4/5 mx-auto"></div>
                        <div className="h-2 bg-gray-100 rounded w-full"></div>
                        <div className="h-2 bg-gray-100 rounded w-3/4 mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-lg font-semibold text-gray-800">{documentTitle}</p>
                <p className="text-sm text-gray-500 mt-2">Préparation de votre document...</p>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none">
              <div className="wave-loader-container">
                <div className="wave-svg-wrapper">
                  <svg className="wave-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.8)" />
                        <stop offset="100%" stopColor="rgba(37, 99, 235, 0.8)" />
                      </linearGradient>
                      <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(96, 165, 250, 0.6)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
                      </linearGradient>
                      <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(147, 197, 253, 0.4)" />
                        <stop offset="100%" stopColor="rgba(96, 165, 250, 0.4)" />
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