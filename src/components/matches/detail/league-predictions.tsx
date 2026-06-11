import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { scorePrediction } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

type Row = {
  userId: string;
  name: string;
  avatar: string | null;
  homeScore: number;
  awayScore: number;
  points: number | null;
  exact: boolean;
  isCurrentUser: boolean;
};

type LeagueBlock = {
  leagueId: string;
  leagueName: string;
  rows: Row[];
};

/**
 * Predicciones de los miembros de tus ligas para este partido. Se REVELAN
 * con el pitido inicial: hasta el kickoff cada predicción es secreta (la
 * regla se aplica aquí, en servidor — el cliente nunca recibe los datos
 * antes de tiempo).
 */
async function getLeaguePredictions(matchId: string): Promise<LeagueBlock[] | null> {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    return null;
  }
  if (!user) return null;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      kickoffAt: true,
      status: true,
      homeScore: true,
      awayScore: true,
      stage: true,
      advanced: true,
    },
  });
  // Secreto hasta el pitido inicial.
  if (!match || (match.status === "UPCOMING" && match.kickoffAt.getTime() > Date.now())) {
    return null;
  }

  const memberships = await prisma.miniLeagueMember.findMany({
    where: { userId: user.id },
    select: { miniLeagueId: true },
  });
  if (memberships.length === 0) return null;
  const leagueIds = memberships.map((m) => m.miniLeagueId);

  const [leagues, members, predictions] = await Promise.all([
    prisma.miniLeague.findMany({
      where: { id: { in: leagueIds } },
      select: { id: true, name: true },
    }),
    prisma.miniLeagueMember.findMany({
      where: { miniLeagueId: { in: leagueIds } },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    }),
    prisma.prediction.findMany({
      where: { matchId, leagueId: { in: leagueIds } },
      select: {
        userId: true,
        leagueId: true,
        homeScore: true,
        awayScore: true,
        points: true,
        exact: true,
        advancePick: true,
      },
    }),
  ]);

  const usersById = new Map(members.map((m) => [m.user.id, m.user]));
  const isLive = match.status === "LIVE";

  return leagues
    .map((league) => {
      const rows: Row[] = predictions
        .filter((p) => p.leagueId === league.id)
        .map((p) => {
          const u = usersById.get(p.userId);
          // Puntos: definitivos si terminó; provisionales con el marcador
          // actual si está en juego.
          let points = p.points;
          let exact = p.exact;
          if (isLive) {
            const breakdown = scorePrediction(
              { homeScore: p.homeScore, awayScore: p.awayScore, advancePick: p.advancePick },
              match,
            );
            points = breakdown?.total ?? 0;
            exact = breakdown?.exact ?? false;
          }
          return {
            userId: p.userId,
            name: u?.name ?? u?.email ?? "Jugador",
            avatar: u?.avatar ?? null,
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            points,
            exact,
            isCurrentUser: p.userId === user.id,
          };
        })
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name));
      return { leagueId: league.id, leagueName: league.name, rows };
    })
    .filter((block) => block.rows.length > 0);
}

export async function LeaguePredictionsSection({ matchId }: { matchId: string }) {
  const blocks = await getLeaguePredictions(matchId);
  if (!blocks || blocks.length === 0) return null;

  return (
    <section className="border-border bg-card rounded-2xl border p-5">
      <h2 className="mb-1 flex items-center gap-2 font-mono text-base font-bold">
        <span>🎯</span>
        Predicciones de tu liga
      </h2>
      <p className="text-muted-foreground mb-4 text-xs">
        Reveladas con el pitido inicial{" "}
        {blocks.some((b) => b.rows.some((r) => r.points !== null))
          ? "· puntos en directo"
          : ""}
      </p>

      <div className="space-y-5">
        {blocks.map((block) => (
          <div key={block.leagueId}>
            {blocks.length > 1 && (
              <p className="text-muted-foreground mb-2 truncate font-mono text-2xs tracking-wide uppercase">
                {block.leagueName}
              </p>
            )}
            <ul className="space-y-1.5">
              {block.rows.map((row) => (
                <li
                  key={row.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2",
                    row.isCurrentUser ? "bg-primary/8 ring-primary/20 ring-1" : "bg-muted/40",
                  )}
                >
                  <Link
                    href={`/perfil/${row.userId}`}
                    className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-80"
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage
                        src={
                          row.avatar?.startsWith("data:") || row.avatar?.startsWith("http")
                            ? row.avatar
                            : "/avatar-default.webp"
                        }
                        alt={row.name}
                      />
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {row.name}
                      {row.isCurrentUser && (
                        <span className="text-primary ml-1.5 font-mono text-3xs">(tú)</span>
                      )}
                    </span>
                  </Link>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {row.homeScore}–{row.awayScore}
                  </span>
                  {row.points !== null && (
                    <span
                      className={cn(
                        "min-w-10 rounded-full px-2 py-0.5 text-center font-mono text-2xs font-bold",
                        row.exact
                          ? "bg-amber-500/15 text-amber-500"
                          : row.points > 0
                            ? "bg-live/15 text-live"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {row.points > 0 ? `+${row.points}` : "0"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
