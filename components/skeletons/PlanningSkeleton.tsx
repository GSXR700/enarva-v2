// components/skeletons/PlanningSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function PlanningSkeleton() {
  return (
    <div className="main-content flex flex-col h-full">
        <div className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24 rounded-md" />
                    <div className="flex gap-1">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-10 w-10 rounded-md" />
                    </div>
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-10 w-[120px] rounded-md" />
            </div>
        </div>
        <div className="grid grid-cols-7 gap-2 flex-grow min-h-0">
            {[...Array(7)].map((_, i) => (
                <div key={i} className="bg-card border rounded-lg flex flex-col">
                    <div className="p-2 border-b text-center">
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-7 w-7 mx-auto mt-2 rounded-full" />
                    </div>
                    <div className="p-2 space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}