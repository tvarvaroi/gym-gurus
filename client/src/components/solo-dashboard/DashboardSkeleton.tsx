import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-16">
      {/* Hero skeleton */}
      <div className="rounded-2xl p-6 md:p-8 bg-card/50 border border-border/30">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
            <div className="flex flex-wrap gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="w-40 h-40 rounded-full mx-auto md:mx-0" />
        </div>
      </div>

      {/* Today's action skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Skeleton className="md:col-span-3 h-52 rounded-xl" />
        <Skeleton className="md:col-span-2 h-52 rounded-xl" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Recovery + body stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>

      {/* Feature grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
