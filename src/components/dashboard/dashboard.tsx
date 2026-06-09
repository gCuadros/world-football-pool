import Link from "next/link";
import {
  Trophy,
  Target,
  Radio,
  Globe,
  ArrowRight,
  Plus,
  Users,
} from "lucide-react";

import type { DashboardData } from "@/lib/dashboard";
import type { MatchBase } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { TeamCrest } from "@/components/matches/team-crest";
import { PitchLines } from "@/components/ui/pitch-lines";
import { PushPrompt } from "@/components/notifications/push-prompt";

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

  // Partido destacado del hero: el primero en directo o, si no, el siguiente.
  // Se excluye de las listas de abajo para no repetirlo.
  const featured = liveMatches[0] ?? upcomingMatches[0] ?? null;
  const liveRest = liveMatches.filter((m) => m.id !== featured?.id);
  const upcomingRest = upcomingMatches.filter((m) => m.id !== featured?.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PushPrompt />

      {/* Saludo + CTA pendientes */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hola, {firstName} 👋</h1>
          <p className="text-muted-foreground text-sm">
            {leagues.length > 0
              ? "Esto es lo que pasa en tus ligas."
              : "Únete a una liga para empezar a predecir."}
          </p>
        </div>
        {primaryLeagueId && pendingCount > 0 && (
          <Link
            href={`/liga/${primaryLeagueId}/predicciones`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Target className="size-4" />
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
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center gap-4 rounded-2xl border border-dashed p-6 transition-colors"
        >
          <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-xl">
            <Users className="text-primary size-6" />
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
          <SectionHeader icon={<Radio className="size-4" />} title="En directo" accent="live" />
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
          <SectionHeader icon={<Trophy className="size-4" />} title="Mis ligas" />
          <div className="grid gap-3 sm:grid-cols-2">
            {leagues.map((l) => (
              <Link
                key={l.id}
                href={`/liga/${l.id}`}
                className="border-border bg-card hover:bg-card/70 group flex items-center gap-4 rounded-2xl border p-4 transition-colors"
              >
                <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold text-primary">
                  {l.rank ? `#${l.rank}` : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {l.points} pts · {l.accuracy}% · {l.memberCount} jugadores
                  </p>
                </div>
                <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors" />
              </Link>
            ))}
            <Link
              href="/ligas"
              className="border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground flex items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-medium transition-colors"
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
            <SectionHeader icon={<Target className="size-4" />} title="Próximos partidos" />
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
        <QuickLink href="/resultados" icon={<Radio className="size-5" />} label="Resultados" />
        <QuickLink href="/mundial" icon={<Globe className="size-5" />} label="Mundial" />
        <QuickLink href="/ligas" icon={<Users className="size-5" />} label="Mis ligas" />
      </section>
    </div>
  );
}

/**
 * Hero del dashboard: el partido en directo (o el siguiente) sobre el panel
 * "estadio de noche" con líneas de campo, escudos grandes y marcador u hora.
 */
export function HeroMatch({ match, now }: { match: MatchBase; now?: Date }) {
  const live = match.status === "LIVE";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  return (
    <Link
      href={`/partido/${match.id}`}
      className="bg-aurora inset-hairline glow-primary relative block overflow-hidden rounded-3xl p-5 text-white sm:p-6"
    >
      <PitchLines />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-3xs tracking-widest text-white/80 uppercase">
            {stageTag}
          </span>
          {live ? (
            <span className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-rose-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
              </span>
              {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
            </span>
          ) : (
            <span className="font-mono text-2xs text-white/70">
              {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <HeroTeam flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} />
          <div className="flex flex-col items-center gap-1 pb-6">
            {hasScore ? (
              <span className="font-mono text-5xl font-black tracking-tight tabular-nums">
                {match.homeScore}
                <span className="mx-1.5 text-3xl font-bold text-white/40">–</span>
                {match.awayScore}
              </span>
            ) : (
              <>
                <span className="font-mono text-3xl font-black tabular-nums">
                  {formatTime(match.kickoffAt)}
                </span>
                <span className="font-mono text-3xs tracking-[0.3em] text-white/50 uppercase">
                  vs
                </span>
              </>
            )}
          </div>
          <HeroTeam flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-3xs text-white/60">
            {match.stadium}
            {match.city ? ` · ${match.city}` : ""}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
            {live ? "Ver en directo" : "Ver partido"}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroTeam({
  flag,
  crest,
  name,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15">
        <TeamCrest crest={crest} flag={flag} name={name} size={38} />
      </span>
      <span className="w-full truncate text-center text-sm font-semibold">
        {name}
      </span>
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

  return (
    <Link
      href={`/partido/${match.id}`}
      className={`bg-card hover:border-primary/40 flex flex-col gap-2 rounded-xl border p-3 transition-colors ${live ? "border-live/40" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
          {stageTag}
        </span>
        {live && (
          <span className="text-live font-mono text-3xs font-bold">
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <TeamRow flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} score={hasScore ? match.homeScore : null} />
        <TeamRow flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} score={hasScore ? match.awayScore : null} />
      </div>
    </Link>
  );
}

function TeamRow({
  flag,
  crest,
  name,
  score,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  score: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest crest={crest} flag={flag} name={name} size={20} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      {score !== null && (
        <span className="font-mono text-base font-bold tabular-nums">{score}</span>
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
      className="border-border bg-card hover:bg-card/70 flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 text-center transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
