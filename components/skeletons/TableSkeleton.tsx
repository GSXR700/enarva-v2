// components/skeletons/TableSkeleton.tsx - CORRECTED WITH TITLE PROP
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showActions?: boolean
  title?: string
  description?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  showActions = true,
  title,
  description
}: TableSkeletonProps) {
  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Header */}
      {(showHeader || title) && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {title ? (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
                {description && (
                  <p className="text-sm md:text-base text-muted-foreground">{description}</p>
                )}
              </>
            ) : (
              <>
                <div className="h-8 w-48 skeleton rounded-lg" />
                <div className="h-4 w-64 skeleton rounded-lg" />
              </>
            )}
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
      )}

      {/* Search Bar */}
      <Card className="apple-card">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-10 flex-1 skeleton rounded-full" />
            <div className="h-10 w-32 skeleton rounded-full" />
            <div className="h-10 w-24 skeleton rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="border-b border-border/50 p-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="h-4 w-24 skeleton rounded flex-1" />
              ))}
              {showActions && <div className="h-4 w-20 skeleton rounded" />}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {Array.from({ length: rows }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 skeleton rounded-full" />
                  {Array.from({ length: columns - 1 }).map((_, j) => (
                    <div key={j} className="h-4 flex-1 skeleton rounded" />
                  ))}
                  {showActions && (
                    <div className="flex gap-2">
                      <div className="h-8 w-8 skeleton rounded-lg" />
                      <div className="h-8 w-8 skeleton rounded-lg" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}