import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatLiveMinute } from "@/lib/format";

import { auth } from "@/auth";
import { BackButton } from "@/components/ui/back-button";
import { AutoRefresh } from "@/components/matches/auto-refresh";

import {
  getMatchesBase,
  getLiveMatchScore,
  getWorldCupStandings,
  getMatchPrediction,
  getLastPredictionForMatch,
  type MatchBase,
  type PredictionVM,
} from "@/lib/queries";
import { STAGE_LABELS } from "@/lib/labels";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/ui/reveal";
import {
  LineupsSection,
  TimelineSection,
  StatsSection,
  CommunitySection,
  OddsSection,
  AiForecastSection,
  MatchOfficialInfo,
  MatchPhysical,
} from "@/components/matches/detail/sections";
import { LeaguePredictionsSection } from "@/components/matches/detail/league-predictions";
import { MatchVideo } from "@/components/matches/detail/match-video";
import { getMatchVideo, type MatchVideoKind } from "@/lib/match-videos";
import { MatchTabs, type MatchTab } from "@/components/matches/detail/match-tabs";
import { MatchInfoTabs } from "@/components/matches/detail/match-info-tabs";
import { H2HSection } from "@/components/matches/detail/h2h";
import { MatchStandingsSection } from "@/components/matches/detail/match-standings";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

const VALID_TABS = [
  "partido",
  "cronica",
  "cuotas",
  "h2h",
  "clasificacion",
  "video",
] as const satisfies MatchTab[];

function isValidTab(t: unknown): t is MatchTab {
  return (VALID_TABS as readonly string[]).includes(t as string);
}

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ t?: string }>;
}) {
  return (
    <Reveal fallback={<PageSkeleton />}>
      <PartidoContent params={params} searchParams={searchParams} />
    </Reveal>
  );
}

async function PartidoContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = (await searchParams) ?? {};

  const matches = await getMatchesBase();
  let match = matches.find((m) => m.id === id);
  if (!match) notFound();

  if (match.status === "LIVE") {
    const live = await getLiveMatchScore(id);
    if (live) match = { ...match, ...live };
  }

  const showLive = match.status !== "UPCOMING";
  const isLiveNow = match.status === "LIVE";
  const initialTab = isValidTab(t) ? t : isLiveNow ? "cronica" : "partido";
  const isGroupStage = match.stage === "GROUP_STAGE" && match.group != null;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Parallel prefetch: form dots (group stage only), video existence, and H2H availability
  const [standings, videoId, prediction, userPrediction] = await Promise.all([
    isGroupStage ? getWorldCupStandings() : Promise.resolve([]),
    match.status === "FINISHED" || match.status === "UPCOMING"
      ? getMatchVideo(
          match.homeTeam,
          match.awayTeam,
          match.status === "FINISHED" ? "resumen" : "previa",
        )
      : Promise.resolve(null),
    match.externalId ? getMatchPrediction(match.externalId) : Promise.resolve(null),
    userId ? getLastPredictionForMatch(userId, match.id) : Promise.resolve(null),
  ]);

  const groupData = isGroupStage
    ? standings.find((g) => g.group === match.group)
    : null;
  const homeForm = groupData?.teams.find((tm) => tm.nameEs === match.homeTeam)?.form ?? null;
  const awayForm = groupData?.teams.find((tm) => tm.nameEs === match.awayTeam)?.form ?? null;

  const hasH2H = prediction?.homeId != null && prediction?.awayId != null;
  const videoKind: MatchVideoKind = match.status === "FINISHED" ? "resumen" : "previa";

  // ── Partido › Resumen ────────────────────────────────────────────────────
  const resumenSlot = (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <MatchOfficialInfo matchNo={match.matchNo} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <AiForecastSection
          externalId={match.externalId}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeFlag={match.homeFlag}
          awayFlag={match.awayFlag}
        />
      </Suspense>
      {showLive && (
        <>
          <Suspense fallback={<SectionSkeleton />}>
            <LeaguePredictionsSection matchId={id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <CommunitySection matchId={id} />
          </Suspense>
          <Suspense fallback={null}>
            <MatchPhysical matchNo={match.matchNo} />
          </Suspense>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {match.status === "LIVE" && <AutoRefresh intervalMs={30_000} />}
      <BackButton />
      <MatchHeader match={match} homeForm={homeForm} awayForm={awayForm} userPrediction={userPrediction} />
      <MatchTabs
        initialTab={initialTab}
        partido={
          <MatchInfoTabs
            resumen={resumenSlot}
            estadisticas={
              showLive ? (
                <Suspense fallback={<SectionSkeleton />}>
                  <StatsSection externalId={match.externalId} />
                </Suspense>
              ) : undefined
            }
            alineaciones={
              match.externalId ? (
                <Suspense fallback={<SectionSkeleton />}>
                  <LineupsSection
                    externalId={match.externalId}
                    upcoming={match.status === "UPCOMING"}
                  />
                </Suspense>
              ) : undefined
            }
          />
        }
        cronica={
          showLive ? (
            <Suspense fallback={<SectionSkeleton />}>
              <TimelineSection
                externalId={match.externalId}
                homeTeam={match.homeTeam}
              />
            </Suspense>
          ) : undefined
        }
        cuotas={
          match.externalId ? (
            <Suspense fallback={<SectionSkeleton />}>
              <OddsSection externalId={match.externalId} />
            </Suspense>
          ) : undefined
        }
        h2h={
          hasH2H ? (
            <Suspense fallback={<SectionSkeleton />}>
              <H2HSection
                externalId={match.externalId}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
              />
            </Suspense>
          ) : undefined
        }
        clasificacion={
          isGroupStage ? (
            <Suspense fallback={<SectionSkeleton />}>
              <MatchStandingsSection group={match.group} />
            </Suspense>
          ) : undefined
        }
        video={
          videoId ? (
            <MatchVideo videoId={videoId} {...VIDEO_META[videoKind]} />
          ) : undefined
        }
      />
    </div>
  );
}

const VIDEO_META: Record<MatchVideoKind, { label: string; icon: string }> = {
  previa: { label: "Previa del partido", icon: "🎬" },
  resumen: { label: "Resumen del partido", icon: "📺" },
};

function FormDots({ form }: { form: string | null }) {
  if (!form) return null;
  return (
    <div className="mt-0.5 flex justify-center gap-0.5">
      {form.split("").map((r, i) => (
        <span
          key={i}
          className={`inline-block size-1.5 rounded-full ${
            r === "W"
              ? "bg-green-500"
              : r === "L"
                ? "bg-red-500"
                : "bg-muted-foreground/40"
          }`}
        />
      ))}
    </div>
  );
}

function MatchHeader({
  match,
  homeForm,
  awayForm,
  userPrediction,
}: {
  match: MatchBase;
  homeForm: string | null;
  awayForm: string | null;
  userPrediction?: PredictionVM | null;
}) {
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_LABELS[match.stage];

  return (
    <div className="card-glass rounded-2xl p-6">
      {/* Breadcrumb */}
      <p className="mb-1 text-center font-mono text-2xs tracking-widest text-muted-foreground uppercase">
        Fútbol · Mundial · {stageTag}
      </p>

      {/* Date — always visible */}
      <p className="mb-4 text-center text-xs text-muted-foreground capitalize">
        {DATE_FMT.format(new Date(match.kickoffAt))}
      </p>

      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Local */}
        <TeamLink
          name={match.homeTeam}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <TeamCrest crest={match.homeCrest} flag={match.homeFlag} name={match.homeTeam} size={56} />
          <span className="text-sm font-semibold sm:text-base">{match.homeTeam}</span>
          <FormDots form={homeForm} />
        </TeamLink>

        {/* Score / VS / status */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          {hasScore ? (
            <div className="flex items-center gap-2 font-mono text-4xl font-bold tabular-nums">
              <span className={isLive ? "text-primary" : ""}>{match.homeScore}</span>
              <span className="text-muted-foreground">-</span>
              <span className={isLive ? "text-primary" : ""}>{match.awayScore}</span>
            </div>
          ) : (
            <span className="text-muted-foreground font-mono text-lg font-bold">VS</span>
          )}
          {isLive && (
            <span className="text-live flex items-center gap-1.5 font-mono text-2xs font-bold">
              <span className="relative flex size-2">
                <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-live relative inline-flex size-2 rounded-full" />
              </span>
              {formatLiveMinute(match.liveMinute)}
            </span>
          )}
          {isFinished && (
            <span className="text-muted-foreground font-mono text-2xs">FINALIZADO</span>
          )}
        </div>

        {/* Visitante */}
        <TeamLink
          name={match.awayTeam}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <TeamCrest crest={match.awayCrest} flag={match.awayFlag} name={match.awayTeam} size={56} />
          <span className="text-sm font-semibold sm:text-base">{match.awayTeam}</span>
          <FormDots form={awayForm} />
        </TeamLink>
      </div>

      {/* Stadium / city */}
      {(match.stadium || match.city) && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {match.stadium}
          {match.city ? ` · ${match.city}` : ""}
        </p>
      )}

      {/* Badge de predicción del usuario */}
      {userPrediction && (
        <div className="mt-4">
          <PredictionBadge prediction={userPrediction} match={match} />
        </div>
      )}
    </div>
  );
}

function SectionSkeleton() {
  return <Skeleton className="h-40 rounded-2xl" />;
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-10 rounded-full" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
