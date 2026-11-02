import { Suspense } from "react"
import { BerandaDashboard } from "./beranda-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

function BerandaSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[460px] rounded-2xl" />
        <Skeleton className="h-[460px] rounded-2xl" />
      </div>
    </div>
  )
}

export default function BerandaPage() {
  return (
    <Suspense fallback={<BerandaSkeleton />}>
      <BerandaDashboard />
    </Suspense>
  )
}
