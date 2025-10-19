// components/skeletons/DashboardSkeleton.tsx - DASHBOARD SPECIFIC SKELETON
'use client'

import { PageSkeleton } from './PageSkeleton'

export function DashboardSkeleton() {
  return (
    <PageSkeleton
      showHeader={true}
      showStats={true}
      statsCount={4}
      showCards={true}
      cardsCount={6}
    />
  )
}