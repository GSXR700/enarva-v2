// components/skeletons/CardGridSkeleton.tsx - CARD GRID SKELETON
'use client'

import { motion } from 'framer-motion'

interface CardGridSkeletonProps {
  title?: string
  description?: string
  count?: number
  columns?: 1 | 2 | 3 | 4
}

export function CardGridSkeleton({
  title,
  description,
  count = 6,
  columns = 3
}: CardGridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && <div className="h-8 w-48 skeleton rounded-lg" />}
          {description && <div className="h-4 w-96 skeleton rounded-lg" />}
        </div>
      )}

      {/* Cards Grid */}
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="apple-card p-6 space-y-4"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 skeleton rounded" />
                <div className="h-3 w-24 skeleton rounded" />
              </div>
              <div className="h-7 w-20 skeleton rounded-full" />
            </div>

            {/* Card Content */}
            <div className="space-y-3">
              <div className="h-4 w-full skeleton rounded" />
              <div className="h-4 w-5/6 skeleton rounded" />
              <div className="h-4 w-4/6 skeleton rounded" />
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="h-3 w-24 skeleton rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-8 skeleton rounded-lg" />
                <div className="h-8 w-8 skeleton rounded-lg" />
                <div className="h-8 w-8 skeleton rounded-lg" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}