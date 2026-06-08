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
import { STAGE_SHORT } from "@/lib/labels";
import { TeamCrest } from "@/components/matches/team-crest";
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

      {/* En vivo */}
      {liveMatches.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={<Radio className="size-4" />} title="En directo" accent="live" />
          <div className="grid gap-3 sm:grid-cols-2">
            {liveMatches.map((m) => (
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
      {upcomingMatches.length > 0 && (
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
            {upcomingMatches.map((m) => (
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
