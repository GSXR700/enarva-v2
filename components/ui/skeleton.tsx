// components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted dark:bg-[hsl(0_0%_15%)]",
        className
      )}
      {...props}
    />
  )
}

// Specialized skeleton components for common patterns
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border border-border rounded-20px p-6 space-y-4 shadow-sm", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 py-4 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-12 w-12"
  }
  
  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />
}

export { Skeleton, CardSkeleton, TableRowSkeleton, AvatarSkeleton }