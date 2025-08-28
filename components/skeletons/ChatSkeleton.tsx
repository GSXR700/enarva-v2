// components/skeletons/ChatSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation List Skeleton */}
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-border bg-card flex-col hidden md:flex h-full">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Window Skeleton */}
      <div className="flex-1 flex-col bg-background h-full hidden md:flex">
        <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-end gap-2 justify-start">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-16 w-48 rounded-2xl" />
          </div>
          <div className="flex items-end gap-2 justify-end">
            <Skeleton className="h-20 w-56 rounded-2xl" />
          </div>
          <div className="flex items-end gap-2 justify-start">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-2xl" />
          </div>
        </div>
        <div className="p-4 bg-card border-t border-border">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}