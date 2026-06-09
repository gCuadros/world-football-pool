"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { TeamCrest } from "@/components/matches/team-crest";

function TeamRow({
  flag,
  crest,
  name,
  score,
  scoreTone,
  winner,
  crestName,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  score: number | null;
  scoreTone: string;
  winner: boolean;
  /** view-transition-name para el morph escudo → ficha del partido. */
  crestName?: string;
}) {
  const crestEl = (
    <TeamCrest crest={crest} flag={flag} name={name} size={24} className="shrink-0" />
  );
  return (
    <div className="flex items-center gap-2.5">
      {crestName ? (
        <ViewTransition name={crestName} default="none">
          {crestEl}
        </ViewTransition>
      ) : (
        crestEl
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          winner ? "font-semibold" : "font-medium",
        )}
      >
        {name}
      </span>
      {score !== null ? (
        <span className={cn("font-mono text-2xl font-black tabular-nums", scoreTone)}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function MatchCard({
  match,
  now,
  publicMode = false,
}: {
  match: MatchVM;
  now: Date;
  publicMode?: boolean;
}) {
  const { status, homeScore, awayScore, prediction } = match;
  const isLive = status === "LIVE";
  const isFinished = status === "FINISHED";
  const hasScore = homeScore !== null && awayScore !== null;
  const scoreTone = isLive ? "text-primary" : "text-foreground";

  const homeWins = hasScore && homeScore! > awayScore!;
  const awayWins = hasScore && awayScore! > homeScore!;

  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  const imminent = status === "UPCOMING" && isLockImminent(match.kickoffAt, now);

  const cardClass = cn(
    "bg-card flex flex-col gap-3 rounded-2xl border p-4 transition-colors shadow-sm",
    isLive
      ? "border-transparent border-l-[3px] border-l-live glow-live"
      : "border-border/60",
    publicMode && !isLive && "hover:border-primary/40 hover:glow-primary",
  );

  const body = (
    <>
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <span className="bg-muted/50 text-muted-foreground rounded-full px-2 py-0.5 font-mono text-3xs tracking-wide uppercase">
          {stageTag}
        </span>
        {isLive ? (
          <span className="text-live flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider">
            <span className="relative flex size-2">
              <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-live relative inline-flex size-2 rounded-full" />
            </span>
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        ) : isFinished ? (
          <span className="text-muted-foreground font-mono text-2xs font-medium">
            Final
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-2xs">
            {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
          </span>
        )}
      </div>

      {/* Equipos */}
      <div className="space-y-2">
        <TeamRow
          flag={match.homeFlag}
          crest={match.homeCrest}
          name={match.homeTeam}
          score={hasScore ? homeScore : null}
          scoreTone={scoreTone}
          winner={homeWins}
          crestName={publicMode ? `match-${match.id}-crest-home` : undefined}
        />
        <TeamRow
          flag={match.awayFlag}
          crest={match.awayCrest}
          name={match.awayTeam}
          score={hasScore ? awayScore : null}
          scoreTone={scoreTone}
          winner={awayWins}
          crestName={publicMode ? `match-${match.id}-crest-away` : undefined}
        />
      </div>

      <div className="text-muted-foreground truncate font-mono text-3xs">
        {match.stadium}
        {match.city ? ` · ${match.city}` : ""}
      </div>

      {/* Pie: predicción / countdown / CTA */}
      {publicMode ? (
        imminent ? <Countdown kickoffAt={match.kickoffAt} /> : null
      ) : (
        <div className="mt-auto">
          {imminent ? (
            <Countdown kickoffAt={match.kickoffAt} />
          ) : prediction ? (
            <PredictionBadge prediction={prediction} match={match} />
          ) : status === "UPCOMING" && !match.locked ? (
            <Link
              href="/ligas"
              className="bg-primary-gradient text-white hover:opacity-90 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-opacity shadow-sm shadow-primary/30"
            >
              Predecir
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <div className="text-muted-foreground bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium">
              <Lock className="size-3.5" />
              Sin predicción
            </div>
          )}
        </div>
      )}
    </>
  );

  return publicMode ? (
    <Link href={`/partido/${match.id}`} className={cardClass}>
      {body}
    </Link>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}
