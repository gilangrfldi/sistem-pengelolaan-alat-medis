import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse p-1 sm:p-2">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-44 sm:w-96 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[120px] border border-border/40 bg-card/60 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-8 w-16 rounded" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 sm:p-6 min-h-[360px] flex flex-col gap-4">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
          <Skeleton className="h-44 w-full rounded-xl mt-4" />
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 sm:p-6 min-h-[360px] flex flex-col gap-4">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-72 rounded" />
          <Skeleton className="h-44 w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  )
}

