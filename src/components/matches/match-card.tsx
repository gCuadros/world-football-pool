"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";

function TeamRow({
  flag,
  name,
  score,
  scoreTone,
  winner,
}: {
  flag: string | null;
  name: string;
  score: number | null;
  scoreTone: string;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-6 text-center text-lg leading-none">{flag ?? "🏳️"}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          winner ? "font-semibold" : "font-medium",
        )}
      >
        {name}
      </span>
      {score !== null ? (
        <span className={cn("font-mono text-xl font-bold tabular-nums", scoreTone)}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function MatchCard({ match, now }: { match: MatchVM; now: Date }) {
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

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 transition-colors",
        isLive ? "border-live/40" : "border-border",
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
          {stageTag}
        </span>
        {isLive ? (
          <span className="text-live flex items-center gap-1.5 font-mono text-[11px] font-bold">
            <span className="relative flex size-2">
              <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-live relative inline-flex size-2 rounded-full" />
            </span>
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        ) : isFinished ? (
          <span className="text-muted-foreground font-mono text-[11px] font-medium">
            Final
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-[11px]">
            {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
          </span>
        )}
      </div>

      {/* Equipos */}
      <div className="space-y-2">
        <TeamRow
          flag={match.homeFlag}
          name={match.homeTeam}
          score={hasScore ? homeScore : null}
          scoreTone={scoreTone}
          winner={homeWins}
        />
        <TeamRow
          flag={match.awayFlag}
          name={match.awayTeam}
          score={hasScore ? awayScore : null}
          scoreTone={scoreTone}
          winner={awayWins}
        />
      </div>

      <div className="text-muted-foreground truncate font-mono text-[10px]">
        {match.stadium}
        {match.city ? ` · ${match.city}` : ""}
      </div>

      {/* Pie: predicción / countdown / CTA */}
      <div className="mt-auto">
        {imminent ? (
          <Countdown kickoffAt={match.kickoffAt} />
        ) : prediction ? (
          <PredictionBadge prediction={prediction} />
        ) : status === "UPCOMING" && !match.locked ? (
          <Link
            href="/predicciones"
            className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors"
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
    </div>
  );
}
