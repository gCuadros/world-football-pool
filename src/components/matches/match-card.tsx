"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { ArrowRight, LockSimple } from "@phosphor-icons/react";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { ClickCard } from "@/components/ui/click-card";

/**
 * Columna de equipo del marcador central: escudo grande en un chip y nombre
 * debajo. El chip lleva el view-transition-name del morph escudo → ficha.
 */
function TeamSide({
  flag,
  crest,
  name,
  winner,
  crestName,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  winner: boolean;
  crestName?: string;
}) {
  const chip = (
    <span className="card-glass flex size-14 items-center justify-center rounded-2xl">
      <TeamCrest crest={crest} flag={flag} name={name} size={34} />
    </span>
  );
  // Escudo + nombre enlazan al equipo; el partido tiene su CTA explícito
  // "Ver partido" en el pie (y la tarjeta entera en publicMode).
  return (
    <TeamLink name={name} className="flex min-w-0 flex-col items-center gap-1.5">
      {crestName ? (
        <ViewTransition name={crestName} default="none">
          {chip}
        </ViewTransition>
      ) : (
        chip
      )}
      <span
        className={cn(
          "max-w-full truncate text-center text-xs",
          winner ? "text-foreground font-extrabold" : "text-muted-foreground font-medium",
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

  // El borde y la sombra los aporta .card-glass; aquí solo estados.
  const cardClass = cn(
    "card-glass flex flex-col gap-3 rounded-2xl p-4 transition-all",
    isLive && "card-glass-live",
    publicMode && !isLive && "card-glass-hover",
  );

  // Tono del marcador: en directo todo en primary; finalizado, el del perdedor
  // se apaga para que el resultado se lea de un vistazo.
  const scoreTone = (winner: boolean) =>
    isLive
      ? "text-primary"
      : isFinished && hasScore && !winner && homeScore !== awayScore
        ? "text-muted-foreground/50"
        : "text-foreground";

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
            {formatRelativeDay(match.kickoffAt, now)}
          </span>
        )}
      </div>

      {/* Marcador central: equipos a los lados, resultado u hora en medio */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide
          flag={match.homeFlag}
          crest={match.homeCrest}
          name={match.homeTeam}
          winner={homeWins}
          crestName={publicMode ? `match-${match.id}-crest-home` : undefined}
        />
        <div className="flex flex-col items-center gap-0.5 pb-5">
          {hasScore ? (
            <div className="flex items-baseline gap-1.5 font-mono text-3xl font-black tracking-tight tabular-nums">
              <span className={scoreTone(homeWins)}>{homeScore}</span>
              <span className="text-muted-foreground/40 text-xl font-bold">–</span>
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
          crestName={publicMode ? `match-${match.id}-crest-away` : undefined}
        />
      </div>

      <div className="text-muted-foreground truncate text-center font-mono text-3xs">
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
            transitionTypes={["nav-forward"]}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex items-center justify-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80",
              isLive ? "text-live" : "text-primary",
            )}
          >
            {isLive ? "Ver en directo" : "Ver partido"}
            <ArrowRight className="size-3.5" />
          </Link>
        </>
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
