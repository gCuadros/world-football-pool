import { Suspense } from "react";

import { getMatchesBase } from "@/lib/queries";
import { MatchesView } from "@/components/matches/matches-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Partidos · Quiniela Mundial 2026" };

export default function ResultadosPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ResultadosContent />
    </Suspense>
  );
}

async function ResultadosContent() {
  const matches = await getMatchesBase();
  return <MatchesView matches={matches} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
