import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMatchesViewForLeague, getLastPredictionForMatch } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { PrediccionesLigaView } from "@/components/predictions/predicciones-liga-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await prisma.miniLeague.findUnique({ where: { id }, select: { name: true } });
  return { title: league ? `Predicciones · ${league.name}` : "Predicciones" };
}

export default function PrediccionesLigaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PrediccionesSkeleton />}>
      <PrediccionesContent params={params} />
    </Suspense>
  );
}

async function PrediccionesContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [league, membership] = await Promise.all([
    prisma.miniLeague.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.miniLeagueMember.findUnique({
      where: { userId_miniLeagueId: { userId: user.id, miniLeagueId: id } },
    }),
  ]);

  if (!league) notFound();
  if (!membership) redirect("/ligas");

  const matches = await getMatchesViewForLeague(user.id, id);

  // Autorrelleno: para partidos sin predicción en esta liga, buscar la última de otra.
  const autofills = new Map<string, { homeScore: number; awayScore: number }>();
  for (const m of matches) {
    if (!m.prediction && m.status === "UPCOMING" && !m.locked) {
      const last = await getLastPredictionForMatch(user.id, m.id);
      if (last) autofills.set(m.id, last);
    }
  }

  return (
    <PrediccionesLigaView
      leagueId={id}
      leagueName={league.name}
      matches={matches}
      autofills={Object.fromEntries(autofills)}
    />
  );
}

function PrediccionesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  );
}
