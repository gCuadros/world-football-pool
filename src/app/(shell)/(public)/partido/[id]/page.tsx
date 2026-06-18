import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatLiveMinute } from "@/lib/format";

import { BackButton } from "@/components/ui/back-button";
import { AutoRefresh } from "@/components/matches/auto-refresh";

import { getMatchesBase, getLiveMatchScore, type MatchBase } from "@/lib/queries";
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
  OddsSection,
  AiForecastSection,
  MatchOfficialInfo,
  MatchPhysical,
} from "@/components/matches/detail/sections";
import { LeaguePredictionsSection } from "@/components/matches/detail/league-predictions";
import { MatchVideo } from "@/components/matches/detail/match-video";
import { getMatchVideo, type MatchVideoKind } from "@/lib/match-videos";

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
  let match = matches.find((m) => m.id === id);
  if (!match) notFound();

  // Si está en juego, el marcador del calendario (cacheado) puede ir atrasado:
  // se superpone el marcador en vivo leído directo de la BD, así cada refresh
  // muestra el gol al instante sin esperar a la revalidación del cron.
  if (match.status === "LIVE") {
    const live = await getLiveMatchScore(id);
    if (live) match = { ...match, ...live };
  }

  const showLive = match.status !== "UPCOMING";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Marcador/minuto frescos sin recargar: cada 30s mientras está en
          juego. Coste ~cero: el tick lee la caché del servidor (la API
          externa solo la sondea el cron a su propio ritmo). */}
      {match.status === "LIVE" && <AutoRefresh intervalMs={30_000} />}
      <BackButton />

      <MatchHeader match={match} />

      {/* Datos oficiales FIFA (asistencia, árbitro) — unidos por matchNo. */}
      <Suspense fallback={null}>
        <MatchOfficialInfo matchNo={match.matchNo} />
      </Suspense>

      {/* Vídeo (entre el marcador y las predicciones): resumen al terminar,
          previa antes del pitido. Del canal @Replay, que sí permite embeber
          (FIFA bloquea el embedding de su contenido). */}
      {match.status === "FINISHED" && (
        <Suspense fallback={null}>
          <MatchVideoSection homeTeam={match.homeTeam} awayTeam={match.awayTeam} kind="resumen" />
        </Suspense>
      )}
      {match.status === "UPCOMING" && (
        <Suspense fallback={null}>
          <MatchVideoSection homeTeam={match.homeTeam} awayTeam={match.awayTeam} kind="previa" />
        </Suspense>
      )}

      {/* Pronósticos externos (apuestas + IA): se muestran siempre, también
          antes del pitido (es cuando más valen). La de tu liga va aparte, en
          el bloque live, porque se revela con el pitido inicial. */}
      <Suspense fallback={<SectionSkeleton />}>
        <OddsSection externalId={match.externalId} />
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

      {showLive ? (
        <>
          {/* Predicciones de la liga → cómo predijo la comunidad (ambas van
              juntas, son "lo predicho") → alineaciones → cronología →
              estadísticas. */}
          <Suspense fallback={<SectionSkeleton />}>
            <LeaguePredictionsSection matchId={match.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <CommunitySection matchId={match.id} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <LineupsSection externalId={match.externalId} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <TimelineSection externalId={match.externalId} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <StatsSection externalId={match.externalId} />
          </Suspense>
          {/* Rendimiento físico oficial FIFA (instantánea, unida por matchNo). */}
          <Suspense fallback={null}>
            <MatchPhysical matchNo={match.matchNo} />
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

const VIDEO_META: Record<MatchVideoKind, { label: string; icon: string }> = {
  previa: { label: "Previa del partido", icon: "🎬" },
  resumen: { label: "Resumen del partido", icon: "📺" },
};

async function MatchVideoSection({
  homeTeam,
  awayTeam,
  kind,
}: {
  homeTeam: string;
  awayTeam: string;
  kind: MatchVideoKind;
}) {
  const videoId = await getMatchVideo(homeTeam, awayTeam, kind);
  if (!videoId) return null; // aún no lo han subido → no se muestra nada
  return <MatchVideo videoId={videoId} {...VIDEO_META[kind]} />;
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
            {formatLiveMinute(match.liveMinute)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Local */}
        <TeamLink
          name={match.homeTeam}
          className="flex flex-1 flex-col items-center gap-2 text-center"
        >
          <TeamCrest crest={match.homeCrest} flag={match.homeFlag} name={match.homeTeam} size={56} />
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
          <TeamCrest crest={match.awayCrest} flag={match.awayFlag} name={match.awayTeam} size={56} />
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
