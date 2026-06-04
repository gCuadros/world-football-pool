import { Suspense } from "react";

import { getMatchesBase } from "@/lib/queries";
import { ResultadosView } from "@/components/matches/resultados-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Amistosos · Quiniela Mundial 2026" };

export default function AmistososPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AmistososContent />
    </Suspense>
  );
}

async function AmistososContent() {
  const matches = await getMatchesBase();
  const friendlies = matches.filter((m) => m.stage === "FRIENDLY");

  return (
    <ResultadosView
      matches={friendlies}
      title="Amistosos"
      subtitle="Partidos de selecciones antes del Mundial. Predícelos en la liga «Pseudos Amistosos» para probar la app."
      showStageFilters={false}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
