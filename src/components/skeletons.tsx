import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto de una tarjeta de partido/predicción. */
function CardSkeleton() {
  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}

/** Cuadrícula de tarjetas (partidos / predicciones). */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Fila de chips de filtro. */
export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}

/** Tabla de clasificación. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-border flex items-center gap-3 border-b px-4 py-3 last:border-0"
        >
          <Skeleton className="size-4" />
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 flex-1 max-w-[40%]" />
          <Skeleton className="ml-auto h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

/** Banner grande (clasificación). */
export function BannerSkeleton() {
  return <Skeleton className="h-36 w-full rounded-2xl" />;
}
