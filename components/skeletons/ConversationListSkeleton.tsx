//components/skeletons/ConversationListSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
    return (
        <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-border bg-card flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
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
    );
}