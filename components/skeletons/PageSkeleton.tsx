// components/skeletons/PageSkeleton.tsx - CORRECTED (REMOVED UNUSED IMPORT)
'use client'

import { motion } from 'framer-motion'

interface PageSkeletonProps {
  showHeader?: boolean
  showStats?: boolean
  statsCount?: number
  showTable?: boolean
  showCards?: boolean
  cardsCount?: number
}

export function PageSkeleton({
  showHeader = true,
  showStats = false,
  statsCount = 4,
  showTable = false,
  showCards = false,
  cardsCount = 6
}: PageSkeletonProps) {
  return (
    <div className="main-content space-y-6 animate-fade-in">
      {showHeader && (
        <div className="space-y-2">
          <div className="h-8 w-64 skeleton rounded-lg" />
          <div className="h-4 w-96 skeleton rounded-lg" />
        </div>
      )}

      {showStats && (
        <div className="responsive-grid">
          {Array.from({ length: statsCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="apple-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-8 w-32 skeleton rounded" />
                </div>
                <div className="w-12 h-12 skeleton rounded-xl" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showTable && (
        <div className="apple-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 skeleton rounded" />
            <div className="h-10 w-32 skeleton rounded-lg" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 border border-border/50 rounded-lg"
              >
                <div className="w-10 h-10 skeleton rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-3 w-3/4 skeleton rounded" />
                </div>
                <div className="h-8 w-24 skeleton rounded-lg" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {showCards && (
        <div className="responsive-grid">
          {Array.from({ length: cardsCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="apple-card p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 skeleton rounded-xl" />
                <div className="h-6 w-16 skeleton rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full skeleton rounded" />
                <div className="h-4 w-3/4 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 skeleton rounded-lg" />
                <div className="h-8 w-20 skeleton rounded-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}