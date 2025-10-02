// components/ui/scroll-area.tsx - COMPLETE FIXED VERSION
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-auto',
          // Custom scrollbar styles
          '[&::-webkit-scrollbar]:w-2',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent',
          'hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600',
          // Firefox scrollbar
          'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700',
          'scrollbar-track-transparent',
          className
        )}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(209 213 219) transparent',
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ScrollArea.displayName = 'ScrollArea'

// ScrollBar component for compatibility (not used in this implementation)
const ScrollBar = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ ...props }, ref) => {
    // Silence unused variable warnings by using props and ref
    void props
    void ref
    return null
  }
)

ScrollBar.displayName = 'ScrollBar'

export { ScrollArea, ScrollBar }