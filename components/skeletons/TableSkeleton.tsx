// components/skeletons/TableSkeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  title: string;
}

export function TableSkeleton({ title }: TableSkeletonProps) {
  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      <Card className="thread-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
            <div className="flex justify-between items-center text-xs text-muted-foreground uppercase">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/6" />
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/5" />
                    <Skeleton className="h-5 w-1/5" />
                    <Skeleton className="h-5 w-1/6" />
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}