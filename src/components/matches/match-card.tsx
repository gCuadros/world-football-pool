"use client";

import Link from "next/link";
import { ArrowRight, LockSimple } from "@phosphor-icons/react";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime, formatLiveMinute } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { ClickCard } from "@/components/ui/click-card";
import { PitchLines } from "@/components/ui/pitch-lines";

/**
 * Columna de equipo del marcador central: escudo grande en un chip y nombre
 * debajo, con el mismo ADN visual que el hero del inicio (chip con anillo,
 * ganador destacado). `onDark` adapta los tonos al panel "estadio de noche"
 * de los partidos en vivo.
 */
function TeamSide({
  flag,
  crest,
  name,
  winner,
  onDark,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  winner: boolean;
  onDark: boolean;
}) {
  // Escudo + nombre enlazan al equipo; el partido tiene su CTA explícito
  // "Ver partido" en el pie (y la tarjeta entera en publicMode).
  return (
    <TeamLink name={name} className="flex min-w-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl ring-1 transition-all",
          onDark
            ? winner
              ? "bg-white/18 ring-white/30"
              : "bg-white/10 ring-white/12"
            : winner
              ? "bg-primary/10 ring-primary/25"
              : "card-glass ring-transparent",
        )}
      >
        <TeamCrest crest={crest} flag={flag} name={name} size={34} />
      </span>
      <span
        className={cn(
          "max-w-full truncate text-center text-xs",
          onDark
            ? winner
              ? "font-extrabold text-white"
              : "font-medium text-white/70"
            : winner
              ? "text-foreground font-extrabold"
              : "text-muted-foreground font-medium",
        )}
      >
        {name}
      </span>
    </TeamLink>
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

  const homeWins = hasScore && homeScore! > awayScore!;
  const awayWins = hasScore && awayScore! > homeScore!;

  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  const imminent = status === "UPCOMING" && isLockImminent(match.kickoffAt, now);

  // En vivo = mini-hero "estadio de noche" (mismo lenguaje que la cabecera
  // del inicio); resto = cristal con estados. El borde lo aporta .card-glass.
  const cardClass = cn(
    "relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 transition-all",
    isLive
      ? "bg-live-hero inset-hairline text-white"
      : "card-glass",
    publicMode && !isLive && "card-glass-hover",
  );

  // Tono del marcador: finalizado, el del perdedor se apaga para que el
  // resultado se lea de un vistazo.
  const scoreTone = (winner: boolean) =>
    isLive
      ? winner || homeScore === awayScore
        ? "text-white"
        : "text-white/40"
      : isFinished && hasScore && !winner && homeScore !== awayScore
        ? "text-muted-foreground/50"
        : "text-foreground";

  const body = (
    <>
      {isLive && <PitchLines />}
      {/* Cabecera */}
      <div className="relative flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-3xs tracking-wide uppercase",
            isLive ? "bg-white/10 text-white/70" : "bg-muted/50 text-muted-foreground",
          )}
        >
          {stageTag}
        </span>
        {isLive ? (
          <span className="text-live flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider">
            <span className="relative flex size-2">
              <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
              <span className="bg-live relative inline-flex size-2 rounded-full" />
            </span>
            {formatLiveMinute(match.liveMinute)}
          </span>
        ) : isFinished ? (
          <span className="text-muted-foreground font-mono text-2xs font-medium">
            Final
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-2xs">
            {formatRelativeDay(match.kickoffAt, now)}
          </span>
        )}
      </div>

      {/* Marcador central: equipos a los lados, resultado u hora en medio */}
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide
          flag={match.homeFlag}
          crest={match.homeCrest}
          name={match.homeTeam}
          winner={homeWins}
          onDark={isLive}
        />
        <div className="flex flex-col items-center gap-0.5 pb-5">
          {hasScore ? (
            <div className="flex items-baseline gap-1.5 font-mono text-3xl font-black tracking-tight tabular-nums">
              <span className={scoreTone(homeWins)}>{homeScore}</span>
              <span
                className={cn(
                  "text-xl font-bold",
                  isLive ? "text-white/30" : "text-muted-foreground/40",
                )}
              >
                –
              </span>
              <span className={scoreTone(awayWins)}>{awayScore}</span>
            </div>
          ) : (
            <>
              <span className="font-mono text-xl font-bold tabular-nums">
                {formatTime(match.kickoffAt)}
              </span>
              <span className="text-muted-foreground/70 font-mono text-3xs tracking-widest uppercase">
                vs
              </span>
            </>
          )}
        </div>
        <TeamSide
          flag={match.awayFlag}
          crest={match.awayCrest}
          name={match.awayTeam}
          winner={awayWins}
          onDark={isLive}
        />
      </div>

      <div
        className={cn(
          "relative truncate text-center font-mono text-3xs",
          isLive ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {match.stadium}
        {match.city ? ` · ${match.city}` : ""}
      </div>

      {/* Pie: predicción / countdown / CTA */}
      {publicMode ? (
        <>
          {imminent ? <Countdown kickoffAt={match.kickoffAt} /> : null}
          {/* CTA explícito al partido: con los equipos enlazando a su ficha,
              la acción "abrir el partido" necesita su propio afford. */}
          <Link
            href={`/partido/${match.id}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative flex items-center justify-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80",
              isLive ? "text-live" : "text-primary",
            )}
          >
            {isLive ? "Ver en directo" : "Ver partido"}
            <ArrowRight className="size-3.5" />
          </Link>
        </>
      ) : (
        <div className="relative mt-auto">
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
              <LockSimple className="size-3.5" weight="fill" />
              Sin predicción
            </div>
          )}
        </div>
      )}
    </>
  );

  return publicMode ? (
    <ClickCard
      href={`/partido/${match.id}`}
      ariaLabel={`${match.homeTeam} contra ${match.awayTeam}`}
      className={cardClass}
    >
      {body}
    </ClickCard>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}
