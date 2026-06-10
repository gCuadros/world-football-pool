import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { GlobeHemisphereWest, Shield, SoccerBall, Handshake, TrendUp } from "@phosphor-icons/react/dist/ssr";

import { teamSlug } from "@/lib/utils";
import { getWorldCupStandings, getWorldCupTopScorers } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamCrest } from "@/components/matches/team-crest";
import { MundialNav } from "@/components/mundial/mundial-nav";

export const metadata = { title: "Clasificación · Mundial 2026" };

export default function MundialPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GlobeHemisphereWest className="text-primary size-5 shrink-0" weight="duotone" />
        <h1 className="text-xl font-bold">Clasificación</h1>
        <span className="text-muted-foreground text-sm">Mundial 2026</span>
      </div>

      <MundialNav />

      <Suspense fallback={<GroupsSkeleton />}>
        <StandingsSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <TopScorersSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <TopAssistersSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <TournamentStatsSection />
      </Suspense>
    </div>
  );
}

async function StandingsSection() {
  const groups = await getWorldCupStandings();

  if (groups.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        Clasificación disponible cuando comience el torneo.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Shield className="text-primary size-4" weight="duotone" />
        Fase de Grupos
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div
            key={g.group}
            className="card-glass min-w-0 overflow-hidden rounded-xl"
          >
            <div className="bg-primary/5 border-border border-b px-3 py-2">
              <span className="text-primary font-mono text-xs font-bold tracking-widest uppercase">
                Grupo {g.group}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-6" />
                  {/* Equipo ocupa el espacio restante */}
                  <col />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-7" />
                  <col className="w-8" />
                </colgroup>
                <thead>
                  <tr className="text-muted-foreground border-border border-b font-mono text-[10px] tracking-wide uppercase">
                    <th className="px-1 py-1.5 text-center">#</th>
                    <th className="px-2 py-1.5 text-left">Equipo</th>
                    <th className="px-1 py-1.5 text-center">PJ</th>
                    <th className="px-1 py-1.5 text-center">GF</th>
                    <th className="px-1 py-1.5 text-center">GC</th>
                    <th className="px-1 py-1.5 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {g.teams.map((t, i) => (
                    <tr
                      key={t.teamId}
                      className={`border-border border-b last:border-0 ${i < 2 ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-1 py-2 text-center font-mono font-semibold text-muted-foreground">{t.rank}</td>
                      <td className="px-2 py-2 max-w-0">
                        <Link
                          href={`/equipo/${teamSlug(t.nameEs)}`}
                          className="flex w-full items-center gap-1.5 transition-colors hover:text-primary"
                        >
                          <TeamCrest
                            crest={t.logo}
                            flag={t.flag}
                            name={t.nameEs}
                            size={14}
                            className="shrink-0"
                          />
                          <span className="truncate font-medium">{t.nameEs}</span>
                        </Link>
                      </td>
                      <td className="px-1 py-2 text-center font-mono">{t.played}</td>
                      <td className="px-1 py-2 text-center font-mono">{t.goalsFor}</td>
                      <td className="px-1 py-2 text-center font-mono">{t.goalsAgainst}</td>
                      <td className="px-1 py-2 text-center font-mono font-bold">{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function TopScorersSection() {
  const scorers = await getWorldCupTopScorers();
  if (scorers.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <SoccerBall className="text-primary size-4" weight="duotone" />
        Bota de Oro
      </h2>
      <div className="card-glass overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border bg-muted/30 border-b font-mono text-3xs tracking-wide uppercase">
              <th className="px-2 py-2 text-left sm:px-3">#</th>
              <th className="px-2 py-2 text-left sm:px-3">Jugador</th>
              <th className="hidden px-3 py-2 text-left sm:table-cell">Equipo</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">Asis</th>
              <th className="px-2 py-2 text-center font-bold sm:px-3">Goles</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s) => (
              <tr key={s.playerName} className="border-border border-b last:border-0 hover:bg-muted/20">
                <td className="text-muted-foreground px-2 py-2 font-mono text-xs sm:px-3">{s.rank}</td>
                <td className="px-2 py-2 sm:px-3">
                  <div className="flex items-center gap-2">
                    {s.photo ? (
                      <Image src={s.photo} alt={s.playerName} width={24} height={24} className="size-6 shrink-0 rounded-full" unoptimized />
                    ) : (
                      <div className="bg-muted size-6 shrink-0 rounded-full" />
                    )}
                    <span className="min-w-0 truncate font-medium">{s.playerName}</span>
                    <TeamCrest crest={s.teamLogo} flag={s.teamFlag} name={s.teamName} size={14} className="shrink-0 sm:hidden" />
                  </div>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <TeamCrest crest={s.teamLogo} flag={s.teamFlag} name={s.teamName} size={16} />
                    <span className="text-muted-foreground text-xs">{s.teamName}</span>
                  </div>
                </td>
                <td className="hidden px-3 py-2 text-center font-mono text-xs sm:table-cell">{s.assists}</td>
                <td className="text-primary px-2 py-2 text-center font-mono text-sm font-bold sm:px-3">{s.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function TopAssistersSection() {
  const scorers = await getWorldCupTopScorers();
  const assisters = [...scorers]
    .filter((s) => s.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10);

  if (assisters.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Handshake className="text-primary size-4" weight="duotone" />
        Máximos Asistentes
      </h2>
      <div className="card-glass overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border bg-muted/30 border-b font-mono text-3xs tracking-wide uppercase">
              <th className="px-2 py-2 text-left sm:px-3">#</th>
              <th className="px-2 py-2 text-left sm:px-3">Jugador</th>
              <th className="hidden px-3 py-2 text-left sm:table-cell">Equipo</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">PJ</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">Goles</th>
              <th className="px-2 py-2 text-center font-bold sm:px-3">Asist.</th>
            </tr>
          </thead>
          <tbody>
            {assisters.map((s, i) => (
              <tr key={s.playerName} className="border-border border-b last:border-0 hover:bg-muted/20">
                <td className="text-muted-foreground px-2 py-2 font-mono text-xs sm:px-3">{i + 1}</td>
                <td className="px-2 py-2 sm:px-3">
                  <div className="flex items-center gap-2">
                    {s.photo ? (
                      <Image src={s.photo} alt={s.playerName} width={24} height={24} className="size-6 shrink-0 rounded-full" unoptimized />
                    ) : (
                      <div className="bg-muted size-6 shrink-0 rounded-full" />
                    )}
                    <span className="min-w-0 truncate font-medium">{s.playerName}</span>
                    <TeamCrest crest={s.teamLogo} flag={s.teamFlag} name={s.teamName} size={14} className="shrink-0 sm:hidden" />
                  </div>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <TeamCrest crest={s.teamLogo} flag={s.teamFlag} name={s.teamName} size={16} />
                    <span className="text-muted-foreground text-xs">{s.teamName}</span>
                  </div>
                </td>
                <td className="hidden px-3 py-2 text-center font-mono text-xs sm:table-cell">{s.played}</td>
                <td className="hidden px-3 py-2 text-center font-mono text-xs sm:table-cell">{s.goals}</td>
                <td className="text-primary px-2 py-2 text-center font-mono text-sm font-bold sm:px-3">{s.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function TournamentStatsSection() {
  const groups = await getWorldCupStandings();
  const allTeams = groups.flatMap((g) => g.teams).filter((t) => t.played > 0);
  if (allTeams.length === 0) return null;

  const bestAttack = [...allTeams].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...allTeams].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const mostPoints = [...allTeams].sort((a, b) => b.points - a.points)[0];

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <TrendUp className="text-primary size-4" weight="duotone" />
        Estadísticas del torneo
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <TournamentStatCard
          title="Mejor ataque"
          subtitle={`${bestAttack.goalsFor} goles anotados`}
          team={bestAttack}
        />
        <TournamentStatCard
          title="Mejor defensa"
          subtitle={`${bestDefense.goalsAgainst} goles encajados`}
          team={bestDefense}
        />
        <TournamentStatCard
          title="Más puntos"
          subtitle={`${mostPoints.points} puntos`}
          team={mostPoints}
        />
      </div>
    </section>
  );
}

function TournamentStatCard({
  title,
  subtitle,
  team,
}: {
  title: string;
  subtitle: string;
  team: { nameEs: string; logo: string | null; flag: string | null };
}) {
  return (
    <Link
      href={`/equipo/${teamSlug(team.nameEs)}`}
      className="bg-card border-border/60 hover:border-primary/40 flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors"
    >
      <TeamCrest crest={team.logo} flag={team.flag} name={team.nameEs} size={36} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">{title}</p>
        <p className="truncate font-bold">{team.nameEs}</p>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}

function GroupsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
