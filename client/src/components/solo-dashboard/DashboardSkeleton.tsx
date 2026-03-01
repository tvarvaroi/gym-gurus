import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 space-y-10 pb-20">
      {/* Hero skeleton — no card */}
      <div className="flex flex-col-reverse md:flex-row gap-8 pt-4">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-8 mt-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="w-[100px] h-[100px] md:w-[180px] md:h-[180px] rounded-full mx-auto md:mx-0 flex-shrink-0" />
      </div>

      {/* Today's workout skeleton — full width */}
      <Skeleton className="h-48 rounded-2xl" />

      {/* Stats card skeleton */}
      <Skeleton className="h-28 rounded-2xl" />

      {/* Volume chart + Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[140px] rounded-2xl" />
      </div>

      {/* Recovery + Body stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      {/* Feature grid — 6 items */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
