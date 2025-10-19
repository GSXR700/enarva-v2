// components/skeletons/DetailsSkeleton.tsx - DETAILS PAGE SKELETON
'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function DetailsSkeleton() {
  return (
    <div className="main-content space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="h-8 w-64 skeleton rounded-lg" />
          <div className="h-4 w-96 skeleton rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 skeleton rounded-lg" />
          <div className="h-10 w-24 skeleton rounded-lg" />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="apple-card">
            <CardContent className="p-6 space-y-6">
              {/* Profile Section */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 skeleton rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 w-48 skeleton rounded" />
                  <div className="h-4 w-32 skeleton rounded" />
                </div>
              </div>

              <Separator />

              {/* Info Sections */}
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-3"
                >
                  <div className="h-5 w-40 skeleton rounded" />
                  <div className="space-y-2 pl-6">
                    <div className="h-4 w-full skeleton rounded" />
                    <div className="h-4 w-5/6 skeleton rounded" />
                    <div className="h-4 w-4/6 skeleton rounded" />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <Card className="apple-card">
            <CardContent className="p-6 space-y-4">
              <div className="h-5 w-32 skeleton rounded" />
              <Separator />
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="space-y-2"
                >
                  <div className="h-3 w-20 skeleton rounded" />
                  <div className="h-4 w-full skeleton rounded" />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}