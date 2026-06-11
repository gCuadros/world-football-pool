import Link from "next/link";
import {
  Trophy,
  Target,
  Broadcast,
  GlobeHemisphereWest,
  ArrowRight,
  Plus,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

import type { DashboardData } from "@/lib/dashboard";
import { STAGE_SHORT } from "@/lib/labels";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { ClickCard } from "@/components/ui/click-card";
import { HeroMatch } from "@/components/dashboard/hero-match";
import { PushPrompt } from "@/components/notifications/push-prompt";
import { AppBadge } from "@/components/app/app-badge";

export function Dashboard({
  data,
  userName,
}: {
  data: DashboardData;
  userName: string;
}) {
  const { leagues, liveMatches, upcomingMatches, pendingCount, primaryLeagueId } =
    data;
  const firstName = userName.split(" ")[0] || userName;

  // Los amistosos ya no llegan aquí (getMatchesBase los filtra): el hero
  // destaca el primer partido en directo del torneo o el siguiente.
  const featured = liveMatches[0] ?? upcomingMatches[0] ?? null;
  const liveRest = liveMatches.filter((m) => m.id !== featured?.id);
  const upcomingRest = upcomingMatches.filter((m) => m.id !== featured?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PushPrompt />
      {/* Badge en el icono de la app instalada: predicciones pendientes. */}
      <AppBadge count={pendingCount} />

      {/* Saludo + CTA pendientes */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hola, <span className="text-gradient-primary">{firstName}</span>
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {leagues.length > 0
              ? "Esto es lo que pasa en tus ligas."
              : "Únete a una liga para empezar a predecir."}
          </p>
        </div>
        {primaryLeagueId && pendingCount > 0 && (
          <Link
            href={`/liga/${primaryLeagueId}/predicciones`}
            className="bg-primary-gradient shadow-primary/25 flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
          >
            <Target className="size-4" weight="bold" />
            {pendingCount} {pendingCount === 1 ? "predicción" : "predicciones"} pendiente
            {pendingCount === 1 ? "" : "s"}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </div>

      {/* Sin ligas → onboarding */}
      {leagues.length === 0 && (
        <Link
          href="/ligas"
          className="card-glass card-glass-hover flex items-center gap-4 rounded-2xl p-6"
        >
          <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
            <UsersThree className="text-primary size-6" weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Crea o únete a una liga</p>
            <p className="text-muted-foreground text-sm">
              Las predicciones y la clasificación viven dentro de cada liga.
            </p>
          </div>
          <ArrowRight className="text-primary size-5 shrink-0" />
        </Link>
      )}

      {/* Partido destacado */}
      {featured && <HeroMatch match={featured} />}

      {/* En vivo */}
      {liveRest.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={<Broadcast className="size-4" weight="duotone" />} title="En directo" accent="live" />
          <div className="grid gap-3 sm:grid-cols-2">
            {liveRest.map((m) => (
              <MiniMatch key={m.id} match={m} live />
            ))}
          </div>
        </section>
      )}

      {/* Mis ligas */}
      {leagues.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={<Trophy className="size-4" weight="duotone" />} title="Mis ligas" />
          <div className="grid gap-3 sm:grid-cols-2">
            {leagues.map((l) => (
              <Link
                key={l.id}
                href={`/liga/${l.id}`}
                className="card-glass card-glass-hover group flex items-center gap-4 rounded-2xl p-4"
              >
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-black text-primary">
                  {l.rank ? `#${l.rank}` : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {l.points} pts · {l.accuracy}% · {l.memberCount} jugadores
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
              </Link>
            ))}
            <Link
              href="/ligas"
              className="border-border text-muted-foreground hover:border-primary/30 hover:text-foreground flex items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-medium transition-colors"
            >
              <Plus className="size-4" />
              Crear o unirse a otra liga
            </Link>
          </div>
        </section>
      )}

      {/* Próximos partidos */}
      {upcomingRest.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader icon={<Target className="size-4" weight="duotone" />} title="Próximos partidos" />
            <Link
              href="/resultados"
              className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
            >
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingRest.map((m) => (
              <MiniMatch key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Accesos rápidos */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink href="/resultados" icon={<Broadcast className="size-5" weight="duotone" />} label="Resultados" />
        <QuickLink href="/mundial" icon={<GlobeHemisphereWest className="size-5" weight="duotone" />} label="Mundial" />
        <QuickLink href="/ligas" icon={<UsersThree className="size-5" weight="duotone" />} label="Mis ligas" />
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: "live";
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold">
      <span className={accent === "live" ? "text-live" : "text-primary"}>{icon}</span>
      {title}
    </h2>
  );
}

function MiniMatch({
  match,
  live,
}: {
  match: DashboardData["upcomingMatches"][number];
  live?: boolean;
}) {
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const homeWins = hasScore && match.homeScore! > match.awayScore!;
  const awayWins = hasScore && match.awayScore! > match.homeScore!;

  return (
    <ClickCard
      href={`/partido/${match.id}`}
      ariaLabel={`${match.homeTeam} contra ${match.awayTeam}`}
      className={`card-glass flex flex-col gap-2.5 rounded-2xl p-3.5 ${live ? "card-glass-live" : "card-glass-hover"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
          {stageTag}
        </span>
        {live && (
          <span className="text-live flex items-center gap-1 font-mono text-3xs font-bold">
            <span className="bg-live inline-block size-1.5 animate-pulse rounded-full" />
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TeamRow flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} score={hasScore ? match.homeScore : null} winner={homeWins} />
        <TeamRow flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} score={hasScore ? match.awayScore : null} winner={awayWins} />
      </div>
    </ClickCard>
  );
}

function TeamRow({
  flag,
  crest,
  name,
  score,
  winner,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  score: number | null;
  winner?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <TeamLink name={name} className="flex w-fit max-w-full items-center gap-2">
          <TeamCrest crest={crest} flag={flag} name={name} size={20} className="shrink-0" />
          <span className={`truncate text-sm ${winner ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
            {name}
          </span>
        </TeamLink>
      </div>
      {score !== null && (
        <span className={`font-mono text-base tabular-nums ${winner ? "font-black text-foreground" : "font-semibold text-muted-foreground"}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="card-glass card-glass-hover flex flex-col items-center justify-center gap-2.5 rounded-2xl p-5 text-center"
    >
      <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
