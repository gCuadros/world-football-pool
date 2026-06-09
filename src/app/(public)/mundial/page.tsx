import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, Shield, Goal, Network, Handshake, TrendingUp } from "lucide-react";

import { teamSlug } from "@/lib/utils";

import { getWorldCupStandings, getWorldCupTopScorers } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/ui/reveal";
import { TeamCrest } from "@/components/matches/team-crest";

export const metadata = { title: "Mundial 2026 · Quiniela" };

export default function MundialPage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Globe className="text-primary size-5" />
        <h1 className="text-xl font-bold">Mundial 2026</h1>
        <span className="text-muted-foreground text-sm">USA · Canada · Mexico</span>
        <Link
          href="/eliminatorias"
          className="text-primary hover:text-primary/80 ml-auto flex items-center gap-1.5 font-mono text-xs font-medium transition-colors"
        >
          <Network className="size-3.5" />
          Eliminatorias
        </Link>
      </div>

      <Reveal fallback={<GroupsSkeleton />}>
        <StandingsSection />
      </Reveal>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <TopScorersSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <TopAssistersSection />
      </Suspense>

      <Reveal fallback={<Skeleton className="h-40 rounded-xl" />}>
        <TournamentStatsSection />
      </Reveal>
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
        <Shield className="text-primary size-4" />
        Fase de Grupos
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div
            key={g.group}
            className="border-border bg-card overflow-hidden rounded-xl border"
          >
            <div className="bg-primary/5 border-border border-b px-4 py-2">
              <span className="text-primary font-mono text-xs font-bold tracking-widest uppercase">
                Grupo {g.group}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b font-mono text-3xs tracking-wide uppercase">
                  <th className="px-3 py-1.5 text-left" colSpan={2}>Equipo</th>
                  <th className="px-1 py-1.5 text-center">PJ</th>
                  <th className="px-1 py-1.5 text-center">GF</th>
                  <th className="px-1 py-1.5 text-center">GC</th>
                  <th className="px-2 py-1.5 text-center font-bold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {g.teams.map((t, i) => (
                  <tr
                    key={t.teamId}
                    className={`border-border border-b last:border-0 ${i < 2 ? "bg-primary/3" : ""}`}
                  >
                    <td className="text-muted-foreground w-6 px-2 py-2 text-center font-mono text-xs">
                      {t.rank}
                    </td>
                    <td className="max-w-0 px-1 py-2">
                      <Link
                        href={`/equipo/${teamSlug(t.nameEs)}`}
                        className="flex min-w-0 items-center gap-2 hover:text-primary transition-colors"
                      >
                        <TeamCrest
                          crest={t.logo}
                          flag={t.flag}
                          name={t.nameEs}
                          size={18}
                          className="shrink-0"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{t.nameEs}</span>
                      </Link>
                    </td>
                    <td className="px-1 py-2 text-center font-mono text-xs">{t.played}</td>
                    <td className="px-1 py-2 text-center font-mono text-xs">{t.goalsFor}</td>
                    <td className="px-1 py-2 text-center font-mono text-xs">{t.goalsAgainst}</td>
                    <td className="px-2 py-2 text-center font-mono text-sm font-bold">
                      {t.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

async function TopScorersSection() {
  const scorers = await getWorldCupTopScorers();

  if (scorers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Goal className="text-primary size-4" />
        Bota de Oro
      </h2>
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border bg-muted/30 border-b font-mono text-3xs tracking-wide uppercase">
              <th className="px-2 py-2 text-left sm:px-3">#</th>
              <th className="px-2 py-2 text-left sm:px-3">Jugador</th>
              <th className="hidden px-3 py-2 text-left sm:table-cell">Equipo</th>
              <th className="hidden px-3 py-2 text-center sm:table-cell">PJ</th>
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
                      <Image
                        src={s.photo}
                        alt={s.playerName}
                        width={24}
                        height={24}
                        className="size-6 shrink-0 rounded-full"
                        unoptimized
                      />
                    ) : (
                      <div className="bg-muted size-6 shrink-0 rounded-full" />
                    )}
                    <span className="min-w-0 truncate font-medium">{s.playerName}</span>
                    {/* Equipo inline en móvil (la columna Equipo se oculta) */}
                    <TeamCrest
                      crest={s.teamLogo}
                      flag={s.teamFlag}
                      name={s.teamName}
                      size={14}
                      className="shrink-0 sm:hidden"
                    />
                  </div>
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    <TeamCrest crest={s.teamLogo} flag={s.teamFlag} name={s.teamName} size={16} />
                    <span className="text-muted-foreground text-xs">{s.teamName}</span>
                  </div>
                </td>
                <td className="hidden px-3 py-2 text-center font-mono text-xs sm:table-cell">{s.played}</td>
                <td className="hidden px-3 py-2 text-center font-mono text-xs sm:table-cell">{s.assists}</td>
                <td className="text-primary px-2 py-2 text-center font-mono text-sm font-bold sm:px-3">
                  {s.goals}
                </td>
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
        <Handshake className="text-primary size-4" />
        Máximos Asistentes
      </h2>
      <div className="border-border bg-card overflow-hidden rounded-xl border">
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
        <TrendingUp className="text-primary size-4" />
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
      className="bg-card border-border/60 hover:border-primary/40 hover:glow-primary flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors"
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
