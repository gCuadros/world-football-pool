import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getUserLeagues, getLeagueLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { LigasActions } from "@/components/ligas/ligas-actions";
import { Onboarding } from "@/components/ligas/onboarding";
import { ActiveLeagueBanner } from "@/components/ligas/active-league-banner";
import { FavoriteStar } from "@/components/ligas/favorite-star";

export const metadata = { title: "Mis Ligas · Quiniela Mundial 2026" };

type LeagueWithStats = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  rank: number | null;
  points: number;
  accuracy: number;
};

export default function LigasPage() {
  return (
    <Reveal fallback={<LigasSkeleton />}>
      <LigasContent />
    </Reveal>
  );
}

async function LigasContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leagues = await getUserLeagues(user.id);

  if (leagues.length === 0) {
    return <Onboarding />;
  }

  const [withStats, dbUser] = await Promise.all([
    Promise.all(
      leagues.map(async (l) => {
        const rows = await getLeagueLeaderboard(l.id, user.id);
        const me = rows.find((r) => r.userId === user.id);
        return {
          id: l.id,
          name: l.name,
          inviteCode: l.inviteCode,
          memberCount: l.memberCount,
          isOwner: l.isOwner,
          rank: me?.rank ?? null,
          points: me?.points ?? 0,
          accuracy: me?.accuracy ?? 0,
        };
      }),
    ),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { favoriteLeagueId: true },
    }),
  ]);

  // Liga activa: la favorita si sigue siendo válida, si no la primera.
  const fav = dbUser?.favoriteLeagueId ?? null;
  const ids = withStats.map((l) => l.id);
  const activeId = fav && ids.includes(fav) ? fav : withStats[0].id;
  const active = withStats.find((l) => l.id === activeId) ?? withStats[0];

  return (
    <div className="space-y-6">
      <LigasActions />

      <ActiveLeagueBanner league={active} />

      <h2 className="font-mono text-base font-bold">Todas mis ligas</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {withStats.map((l) => (
          <LeagueCard key={l.id} league={l} active={l.id === activeId} />
        ))}
        <NewLeagueCard />
      </div>
    </div>
  );
}

function LeagueCard({
  league,
  active,
}: {
  league: LeagueWithStats;
  active: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        active ? "bg-muted border-primary" : "bg-card border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {active ? (
          <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 font-mono text-3xs font-bold tracking-wide">
            ACTIVA
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-2xs">
            {league.inviteCode}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {league.isOwner && (
            <span className="text-primary font-mono text-3xs font-medium tracking-wide uppercase">
              Admin
            </span>
          )}
          <FavoriteStar leagueId={league.id} isFavorite={active} />
        </div>
      </div>

      <h3 className="truncate font-mono text-base font-bold">{league.name}</h3>

      <div className="text-muted-foreground flex items-center gap-4 font-mono text-xs">
        <span>{league.rank ? `#${league.rank}` : "—"}</span>
        <span>{league.points} pts</span>
        <span>{league.memberCount} jug.</span>
      </div>

      <Link
        href={`/liga/${league.id}`}
        className={`mt-1 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
          active
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/70 border"
        }`}
      >
        Ver liga
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function NewLeagueCard() {
  return (
    <div className="border-border text-muted-foreground flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed p-5 text-center">
      <div className="bg-secondary flex size-11 items-center justify-center rounded-xl">
        <Plus className="text-primary size-5" />
      </div>
      <p className="text-foreground text-sm font-semibold">Crear nueva liga</p>
      <p className="text-xs">Usa los botones de arriba para crear o unirte</p>
    </div>
  );
}

function LigasSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="ml-auto h-9 w-64" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
