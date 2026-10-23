import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading state for role dashboards: a header, four statistic tiles and
 * two content panels. Uses the role palette through the shell tokens.
 */
export function PageSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      <div className="space-y-3 border-b border-border/70 pb-6">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 ${tiles > 4 ? "lg:grid-cols-3 xl:grid-cols-4" : "xl:grid-cols-4"}`}>
        {Array.from({ length: tiles }).map((_, index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
            <Skeleton className="size-11 rounded-2xl" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((panel) => (
          <div
            key={panel}
            className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
          >
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
