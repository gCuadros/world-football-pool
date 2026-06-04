import { Suspense } from "react";

import { getMatchesBase } from "@/lib/queries";
import { CalendarView } from "@/components/matches/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Calendario · Quiniela Mundial 2026" };

export default function CalendarioPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CalendarioContent />
    </Suspense>
  );
}

async function CalendarioContent() {
  const matches = await getMatchesBase();
  // Incluye Mundial + amistosos en el calendario.
  return <CalendarView matches={matches} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-48" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
