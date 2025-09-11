// components/skeletons/TableSkeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  title?: string;
  description?: string;
  rows?: number;
}

export function TableSkeleton({ 
  title = "Chargement...", 
  description = "Veuillez patienter pendant le chargement des données.",
  rows = 5 
}: TableSkeletonProps) {
  return (
    <div className="main-content space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Table Header */}
          <div className="flex justify-between items-center text-xs text-muted-foreground uppercase border-b pb-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-4 w-1/6" />
          </div>
          
          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b last:border-b-0">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/5" />
              <Skeleton className="h-5 w-1/5" />
              <Skeleton className="h-5 w-1/6" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Loading Message */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 mb-3">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  )
}