import { Suspense } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  const [matches, session] = await Promise.all([getMatchesBase(), auth()]);

  let favoriteTeam: string | null = null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteTeam: true },
    });
    favoriteTeam = user?.favoriteTeam ?? null;
  }

  return <MatchesView matches={matches} favoriteTeam={favoriteTeam} />;
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
