// components/skeletons/CardGridSkeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CardGridSkeletonProps {
  title: string;
  description: string;
}

export function CardGridSkeleton({ title, description }: CardGridSkeletonProps) {
  return (
    <div className="main-content space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <Card className="thread-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 flex-1 min-w-64 rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-48 rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-48 rounded-lg" />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="thread-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}