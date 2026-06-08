import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Target, Trophy } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getLeagueLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShareLeague } from "@/components/ligas/share-league";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const league = await prisma.miniLeague.findUnique({ where: { id }, select: { name: true } });
  return { title: league ? `${league.name} · Quiniela` : "Liga" };
}

export default function LigaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Reveal fallback={<LigaSkeleton />}>
      <LigaContent params={params} />
    </Reveal>
  );
}

async function LigaContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [league, membership] = await Promise.all([
    prisma.miniLeague.findUnique({
      where: { id },
      select: { id: true, name: true, inviteCode: true, createdById: true },
    }),
    prisma.miniLeagueMember.findUnique({
      where: { userId_miniLeagueId: { userId: user.id, miniLeagueId: id } },
    }),
  ]);

  if (!league) notFound();
  if (!membership) redirect("/ligas");

  const rows = await getLeagueLeaderboard(id, user.id);
  const myRow = rows.find((r) => r.userId === user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Cabecera de la liga */}
      <div className="border-border bg-card rounded-2xl border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{league.name}</h1>
            <div className="mt-2">
              <ShareLeague code={league.inviteCode} leagueName={league.name} />
            </div>
          </div>
          <Link
            href={`/liga/${id}/predicciones`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Target className="size-4" />
            Mis predicciones
          </Link>
        </div>

        {/* Stats personales */}
        {myRow && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatPill label="Posición" value={`#${myRow.rank}`} />
            <StatPill label="Puntos" value={String(myRow.points)} />
            <StatPill label="Precisión" value={`${myRow.accuracy}%`} />
          </div>
        )}
      </div>

      {/* Clasificación */}
      <div className="border-border bg-card overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center gap-2 border-b px-5 py-3">
          <Trophy className="text-primary size-4" />
          <h2 className="font-semibold">Clasificación</h2>
          <span className="text-muted-foreground font-mono text-xs">{rows.length} jugadores</span>
        </div>

        {rows.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            Aún no hay predicciones en esta liga.
          </div>
        ) : (
          <div className="divide-border divide-y">
            {rows.map((row) => (
              <div
                key={row.userId}
                className={`flex items-center gap-3 px-5 py-3 ${row.isCurrentUser ? "bg-primary/5" : ""}`}
              >
                {/* Posición */}
                <div className="w-8 shrink-0 text-center">
                  {row.rank <= 3 ? (
                    <span className="font-mono text-base">
                      {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-mono text-sm font-bold">
                      {row.rank}
                    </span>
                  )}
                </div>

                {/* Avatar + Nombre — clicable al perfil */}
                <Link
                  href={`/perfil/${row.userId}`}
                  className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="size-8 shrink-0">
                    {row.avatar && <AvatarImage src={row.avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary font-mono text-xs">
                      {row.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${row.isCurrentUser ? "text-primary" : ""}`}>
                      {row.name}
                      {row.isCurrentUser && (
                        <span className="text-primary/60 ml-1.5 text-xs">(tú)</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {row.predictionsCount} pred · {row.accuracy}% prec
                      {row.currentStreak > 1 && (
                        <span className="text-primary ml-1">🔥 {row.currentStreak}</span>
                      )}
                    </p>
                  </div>
                </Link>

                {/* Puntos */}
                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg font-bold">{row.points}</p>
                  <p className="text-muted-foreground font-mono text-xs">pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-center">
      <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">{label}</p>
      <p className="font-mono text-xl font-bold">{value}</p>
    </div>
  );
}

function LigaSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
