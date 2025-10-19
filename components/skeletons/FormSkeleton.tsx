// components/skeletons/FormSkeleton.tsx - FORM SPECIFIC SKELETON
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface FormSkeletonProps {
  title?: string
  fields?: number
  showButtons?: boolean
}

export function FormSkeleton({
  title,
  fields = 6,
  showButtons = true
}: FormSkeletonProps) {
  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Page Header */}
      {title && (
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-4 w-64 skeleton rounded-lg" />
        </div>
      )}

      {/* Form Card */}
      <Card className="apple-card">
        <CardHeader className="space-y-2 border-b border-border/50 pb-4">
          <div className="h-6 w-40 skeleton rounded" />
          <div className="h-4 w-64 skeleton rounded" />
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Form Fields */}
          {Array.from({ length: fields }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-2"
            >
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-10 w-full skeleton rounded-lg" />
            </motion.div>
          ))}

          {/* Buttons */}
          {showButtons && (
            <div className="flex gap-3 pt-4 border-t border-border/50">
              <div className="h-10 w-24 skeleton rounded-lg" />
              <div className="h-10 w-32 skeleton rounded-lg" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}