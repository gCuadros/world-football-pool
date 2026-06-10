import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Shield, Goal, Swords, TrendingUp, Star, Table2 } from "lucide-react";

import { BackButton } from "@/components/ui/back-button";

import { getTeamPage, type MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { MatchCard } from "@/components/matches/match-card";
import { GroupTable } from "@/components/mundial/group-table";
import { RivalHistory } from "@/components/equipo/rival-history";
import { LastLineup } from "@/components/equipo/last-lineup";
import { ClickCard } from "@/components/ui/click-card";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { PitchLines } from "@/components/ui/pitch-lines";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTeamPage(slug);
  return { title: data ? `${data.name} · Mundial 2026` : "Equipo · Mundial 2026" };
}

export default function EquipoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Reveal fallback={<PageSkeleton />}>
      <EquipoContent params={params} />
    </Reveal>
  );
}

async function EquipoContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTeamPage(slug);
  if (!data) notFound();

  const now = new Date();
  const played = data.matches.filter((m) => m.status === "FINISHED");
  const upcoming = data.matches.filter((m) => m.status === "UPCOMING");

  // Partido destacado: el que esté en directo o, si no, el siguiente.
  const live = data.matches.find((m) => m.status === "LIVE");
  const featured = live ?? upcoming[0] ?? null;
  const upcomingRest = upcoming.filter((m) => m.id !== featured?.id);
  const rivalName = featured
    ? featured.homeTeam === data.name
      ? featured.awayTeam
      : featured.homeTeam
    : null;
  // Último partido jugado con cobertura de la API (para el once inicial).
  const lastCovered = [...played].reverse().find((m) => m.externalId);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Back: vuelve al origen real de la navegación (partidos, mundial,
          dashboard…); /mundial solo como fallback sin historial. */}
      <BackButton fallback="/mundial" />

      {/* Hero: panel "estadio de noche" con escudo y nombre */}
      <section className="card-glass border-border/60 overflow-hidden rounded-3xl border">
        <div className="bg-aurora inset-hairline relative flex items-center gap-5 overflow-hidden p-6 text-white">
          <PitchLines />
          <div className="relative flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15">
            <TeamCrest
              crest={data.crest}
              flag={data.flag}
              name={data.name}
              size={52}
            />
          </div>
          <div className="relative min-w-0">
            <h1 className="truncate text-3xl font-black tracking-tight">
              {data.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {data.group && (
                <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-2xs tracking-widest text-white/80 uppercase ring-1 ring-white/15">
                  Grupo {data.group}
                </span>
              )}
              {data.standing && (
                <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-2xs tracking-widest text-white/80 uppercase ring-1 ring-white/15">
                  {data.standing.rank}º del grupo
                </span>
              )}
              {data.fansCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2.5 py-0.5 font-mono text-2xs tracking-widest text-amber-200 uppercase ring-1 ring-amber-300/25">
                  <Star className="size-2.5 fill-current" />
                  {data.fansCount} {data.fansCount === 1 ? "fan" : "fans"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats del Mundial: registro completo G/E/P + goles + puntos */}
        {data.standing && (
          <div className="border-border/60 grid grid-cols-7 border-t divide-x divide-border/60">
            {[
              { label: "PJ", value: data.standing.played },
              { label: "G", value: data.standing.won, tone: "text-success" },
              { label: "E", value: data.standing.drawn, tone: "text-warning" },
              { label: "P", value: data.standing.lost, tone: "text-live" },
              { label: "GF", value: data.standing.goalsFor },
              { label: "GC", value: data.standing.goalsAgainst },
              { label: "PTS", value: data.standing.points, tone: "text-primary" },
            ].map(({ label, value, tone }) => (
              <div key={label} className="flex flex-col items-center py-3">
                <span className={cn("font-mono text-base font-bold", tone)}>
                  <CountUp value={value} />
                </span>
                <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Forma (últimos resultados) */}
        {data.standing?.form && (
          <div className="border-border/60 flex items-center gap-2 border-t px-5 py-3">
            <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
              Forma
            </span>
            <div className="flex gap-1">
              {data.standing.form.split("").map((r, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex size-5 items-center justify-center rounded font-mono text-2xs font-bold",
                    r === "W" && "bg-success/20 text-success",
                    r === "D" && "bg-warning/20 text-warning",
                    r === "L" && "bg-live/20 text-live",
                  )}
                >
                  {r === "W" ? "G" : r === "L" ? "P" : "E"}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Partido destacado: en directo o el siguiente */}
      {featured && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Swords className={cn("size-4", live ? "text-live" : "text-primary")} />
            {live ? "Jugando ahora" : "Próximo partido"}
          </h2>
          <MatchCard
            match={{ ...featured, prediction: null, locked: false } satisfies MatchVM}
            now={now}
            publicMode
          />
        </section>
      )}

      {/* Pronóstico e historial ante el próximo rival (API externa → stream) */}
      {featured?.externalId && rivalName && (
        <Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
          <RivalHistory
            externalId={featured.externalId}
            teamName={data.name}
            rivalName={rivalName}
          />
        </Suspense>
      )}

      {/* Clasificación del grupo completa */}
      {data.groupTable && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Table2 className="text-primary size-4" />
            Clasificación · Grupo {data.group}
          </h2>
          <GroupTable group={data.groupTable} highlightTeam={data.name} />
        </section>
      )}

      {/* Top scorers del equipo */}
      {data.topScorers.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Goal className="text-primary size-4" />
            Goleadores
          </h2>
          <div className="card-glass border-border/60 overflow-hidden rounded-2xl border">
            {data.topScorers.map((s, i) => (
              <div
                key={s.playerName}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i < data.topScorers.length - 1 && "border-b border-border/60",
                )}
              >
                {s.photo ? (
                  <Image
                    src={s.photo}
                    alt={s.playerName}
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="bg-muted size-8 shrink-0 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.playerName}</p>
                  {s.assists > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {s.assists} asistencia{s.assists !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 font-mono text-sm">
                  <span className="text-primary font-bold">
                    {s.goals} <span className="text-muted-foreground font-normal text-xs">gol{s.goals !== 1 ? "es" : ""}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Último once inicial (API externa → stream) */}
      {lastCovered?.externalId && (
        <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
          <LastLineup externalId={lastCovered.externalId} teamName={data.name} />
        </Suspense>
      )}

      {/* Partidos disputados */}
      {played.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Swords className="text-primary size-4" />
            Resultados
          </h2>
          <div className="space-y-2">
            {played.map((m) => (
              <TeamMatchRow key={m.id} match={m} teamName={data.name} />
            ))}
          </div>
        </section>
      )}

      {/* Próximos partidos (el destacado ya tiene su tarjeta arriba) */}
      {upcomingRest.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <TrendingUp className="text-primary size-4" />
            Próximos partidos
          </h2>
          <div className="space-y-2">
            {upcomingRest.map((m) => (
              <TeamMatchRow key={m.id} match={m} teamName={data.name} now={now} />
            ))}
          </div>
        </section>
      )}

      {data.matches.length === 0 && (
        <EmptyState
          icon={Shield}
          title="Calendario no disponible"
          description="El calendario de este equipo aún no está disponible. Vuelve cuando arranque su Mundial."
          action={{ href: "/mundial", label: "Ver grupos" }}
        />
      )}
    </div>
  );
}

function TeamMatchRow({
  match,
  teamName,
  now,
}: {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeFlag: string | null;
    awayFlag: string | null;
    homeCrest: string | null;
    awayCrest: string | null;
    homeScore: number | null;
    awayScore: number | null;
    kickoffAt: string;
    stage: string;
    group: string | null;
    stadium: string;
    status: string;
  };
  teamName: string;
  now?: Date;
}) {
  const isHome = match.homeTeam === teamName;
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const isFinished = match.status === "FINISHED";

  let result: "W" | "D" | "L" | null = null;
  if (hasScore) {
    const teamScore = isHome ? match.homeScore! : match.awayScore!;
    const oppScore = isHome ? match.awayScore! : match.homeScore!;
    result = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "D";
  }

  const stageLabel =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage as keyof typeof STAGE_SHORT] ?? match.stage;

  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const oppFlag = isHome ? match.awayFlag : match.homeFlag;
  const oppCrest = isHome ? match.awayCrest : match.homeCrest;

  return (
    <ClickCard
      href={`/partido/${match.id}`}
      ariaLabel={`${match.homeTeam} contra ${match.awayTeam}`}
      className="card-glass border-border/60 hover:border-primary/40 hover:glow-primary flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:-translate-y-0.5"
    >
      <TeamLink name={opponent} className="flex min-w-0 flex-1 items-center gap-3">
        <TeamCrest crest={oppCrest} flag={oppFlag} name={opponent} size={28} className="shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {isHome ? "vs" : "@"} {opponent}
          </span>
          <span className="text-muted-foreground block font-mono text-xs">
            {stageLabel} · {match.stadium}
          </span>
        </span>
      </TeamLink>

      {isFinished && hasScore ? (
        <div className="flex items-center gap-2 text-right">
          <span className="font-mono text-sm font-bold">
            {isHome ? match.homeScore : match.awayScore}–{isHome ? match.awayScore : match.homeScore}
          </span>
          {result && (
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded font-mono text-2xs font-bold",
                result === "W" && "bg-success/20 text-success",
                result === "D" && "bg-warning/20 text-warning",
                result === "L" && "bg-live/20 text-live",
              )}
            >
              {result === "W" ? "G" : result === "L" ? "P" : "E"}
            </span>
          )}
        </div>
      ) : now ? (
        <span className="text-muted-foreground font-mono text-xs shrink-0">
          {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
        </span>
      ) : null}
    </ClickCard>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Skeleton className="h-5 w-24 rounded" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
