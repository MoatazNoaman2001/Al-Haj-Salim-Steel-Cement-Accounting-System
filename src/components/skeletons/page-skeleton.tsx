import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <header className="border-b px-6 py-3 flex items-center justify-between">
      <Skeleton className="h-7 w-32" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-24 mt-2" />
      <Skeleton className="h-3 w-16 mt-2" />
    </div>
  );
}

export function KPIGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-28" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[200px]" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  const widths = ["w-16", "w-24", "w-32", "w-20", "w-28", "w-16", "w-24", "w-20"];

  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/30 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="border-b last:border-0 px-4 py-3 flex gap-4 items-center"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={`h-4 ${widths[(colIdx + rowIdx) % widths.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SectionHeaderSkeleton({ withButton = false }: { withButton?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-6 w-28" />
      {withButton && <Skeleton className="h-8 w-24" />}
    </div>
  );
}

export function CashBalanceSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-7 w-28 mt-2" />
        </div>
      ))}
    </div>
  );
}
