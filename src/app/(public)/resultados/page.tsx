import { Suspense } from "react";
import Link from "next/link";

import { getMatchesBase } from "@/lib/queries";
import { ResultadosView } from "@/components/matches/resultados-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Resultados · Quiniela Mundial 2026" };

export default function ResultadosPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ResultadosContent />
    </Suspense>
  );
}

async function ResultadosContent() {
  const matches = await getMatchesBase();
  // El Mundial: excluye amistosos (tienen su propia sección).
  return (
    <ResultadosView
      matches={matches.filter((m) => m.stage !== "FRIENDLY")}
      calendarHref="/calendario"
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
