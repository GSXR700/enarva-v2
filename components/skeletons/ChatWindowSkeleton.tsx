//components/skeletons/ChatWindowSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ChatWindowSkeleton() {
    return (
        <div className="flex-1 flex flex-col bg-background h-full">
            <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
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
    );
}