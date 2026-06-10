import { Suspense, ViewTransition } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BackButton } from "@/components/ui/back-button";

import { getMatchesBase, type MatchBase } from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/labels";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/ui/reveal";
import {
  LineupsSection,
  TimelineSection,
  StatsSection,
  CommunitySection,
} from "@/components/matches/detail/sections";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matches = await getMatchesBase();
  const m = matches.find((x) => x.id === id);
  return {
    title: m ? `${m.homeTeam} vs ${m.awayTeam}` : "Partido",
  };
}

export default function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Reveal fallback={<PageSkeleton />}>
      <PartidoContent params={params} />
    </Reveal>
  );
}

async function PartidoContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matches = await getMatchesBase();
  const match = matches.find((m) => m.id === id);
  if (!match) notFound();

  const showLive = match.status !== "UPCOMING";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackButton />

      <MatchHeader match={match} />

      {showLive ? (
        <>
          {/* Alineaciones → cronología → estadísticas → comunidad */}
          <Suspense fallback={<SectionSkeleton />}>
            <LineupsSection externalId={match.externalId} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <TimelineSection externalId={match.externalId} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <StatsSection externalId={match.externalId} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <CommunitySection matchId={match.id} />
          </Suspense>
        </>
      ) : (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          El partido aún no ha comenzado. Aquí verás las alineaciones, la
          cronología y las estadísticas cuando arranque.
        </div>
      )}
    </div>
  );
}

function MatchHeader({ match }: { match: MatchBase }) {
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_LABELS[match.stage];

  return (
    <div className="card-glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="text-muted-foreground font-mono text-2xs tracking-widest uppercase">
          {stageTag}
        </span>
        {isLive && (
          <span className="text-live flex items-center gap-1.5 font-mono text-2xs font-bold">
            <span className="relative flex size-2">
              <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-live relative inline-flex size-2 rounded-full" />
            </span>
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Local */}
        <TeamLink
          name={match.homeTeam}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <ViewTransition name={`match-${match.id}-crest-home`} default="none">
            <TeamCrest crest={match.homeCrest} flag={match.homeFlag} name={match.homeTeam} size={56} />
          </ViewTransition>
          <span className="text-sm font-semibold sm:text-base">{match.homeTeam}</span>
        </TeamLink>

        {/* Marcador / hora */}
        <div className="flex shrink-0 flex-col items-center">
          {hasScore ? (
            <div className="flex items-center gap-2 font-mono text-4xl font-bold tabular-nums">
              <span className={isLive ? "text-primary" : ""}>{match.homeScore}</span>
              <span className="text-muted-foreground">-</span>
              <span className={isLive ? "text-primary" : ""}>{match.awayScore}</span>
            </div>
          ) : (
            <span className="text-muted-foreground font-mono text-lg font-bold">VS</span>
          )}
          {isFinished && (
            <span className="text-muted-foreground mt-1 font-mono text-2xs">Final</span>
          )}
        </div>

        {/* Visitante */}
        <TeamLink
          name={match.awayTeam}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <ViewTransition name={`match-${match.id}-crest-away`} default="none">
            <TeamCrest crest={match.awayCrest} flag={match.awayFlag} name={match.awayTeam} size={56} />
          </ViewTransition>
          <span className="text-sm font-semibold sm:text-base">{match.awayTeam}</span>
        </TeamLink>
      </div>

      <p className="text-muted-foreground mt-5 text-center text-xs">
        {!hasScore && <span className="capitalize">{DATE_FMT.format(new Date(match.kickoffAt))}</span>}
        {!hasScore && (match.stadium || match.city) && " · "}
        {match.stadium}
        {match.city ? ` · ${match.city}` : ""}
      </p>
    </div>
  );
}

function SectionSkeleton() {
  return <Skeleton className="h-40 rounded-2xl" />;
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
