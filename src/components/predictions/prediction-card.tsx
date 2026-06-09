"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { savePrediction } from "@/app/(shell)/(app)/predicciones/actions";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { CommunityBreakdown } from "@/components/predictions/community-breakdown";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { MatchEvents } from "@/components/matches/match-events";

const QUICK_PICKS: [number, number][] = [
  [1, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [0, 0],
  [0, 1],
];

const KNOCKOUT_STAGES = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

function TeamLabel({
  flag,
  crest,
  name,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
}) {
  return (
    <TeamLink name={name} className="flex min-w-0 items-center gap-2.5">
      <TeamCrest crest={crest} flag={flag} name={name} size={24} className="shrink-0" />
      <span className="truncate text-sm font-medium">{name}</span>
    </TeamLink>
  );
}

function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  // size-11 (44px) en táctil = objetivo mínimo recomendado para el control más
  // usado de la app; en desktop (hover disponible) vuelve al tamaño compacto.
  const btn =
    "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground flex size-11 items-center justify-center rounded-xl border transition disabled:opacity-40 motion-safe:active:scale-90 lg:size-8";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => {
          haptics.tap();
          onChange(Math.max(0, value - 1));
        }}
        className={btn}
        aria-label="Restar"
      >
        <Minus className="size-4 lg:size-3.5" />
      </button>
      <span className="w-8 text-center font-mono text-2xl font-bold tabular-nums lg:w-7 lg:text-xl">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= 20}
        onClick={() => {
          haptics.tap();
          onChange(Math.min(20, value + 1));
        }}
        className={btn}
        aria-label="Sumar"
      >
        <Plus className="size-4 lg:size-3.5" />
      </button>
    </div>
  );
}

function AdvanceSelector({
  homeTeam,
  awayTeam,
  value,
  onChange,
  disabled,
}: {
  homeTeam: string;
  awayTeam: string;
  value: "HOME" | "AWAY" | null;
  onChange: (v: "HOME" | "AWAY" | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
        ¿Quién pasa? <span className="text-primary font-semibold">+3 pts</span>
      </p>
      <div className="flex gap-1.5">
        {(["HOME", "AWAY"] as const).map((side) => {
          const team = side === "HOME" ? homeTeam : awayTeam;
          const active = value === side;
          return (
            <button
              key={side}
              type="button"
              disabled={disabled}
              onClick={() => {
                haptics.tap();
                onChange(active ? null : side);
              }}
              className={cn(
                "flex-1 truncate rounded-md border px-2 py-2.5 text-xs font-medium transition motion-safe:active:scale-[0.97] lg:py-1.5",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {team}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PredictionCard({
  match,
  now,
  leagueId,
  autofill,
}: {
  match: MatchVM;
  now: Date;
  leagueId: string;
  autofill?: { homeScore: number; awayScore: number } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const editable = match.status === "UPCOMING" && !match.locked;
  const imminent = editable && isLockImminent(match.kickoffAt, now);
  const resolved = match.status === "FINISHED";
  const live = match.status === "LIVE";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const isKnockout = KNOCKOUT_STAGES.has(match.stage);

  const initial = match.prediction ?? autofill ?? { homeScore: 0, awayScore: 0 };
  const [home, setHome] = useState(initial.homeScore);
  const [away, setAway] = useState(initial.awayScore);
  const [advancePick, setAdvancePick] = useState<"HOME" | "AWAY" | null>(
    match.prediction?.advancePick ?? null,
  );

  const saved = match.prediction;
  const dirty =
    !saved ||
    saved.homeScore !== home ||
    saved.awayScore !== away ||
    (isKnockout && saved.advancePick !== advancePick);

  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  function handleSave() {
    startTransition(async () => {
      const res = await savePrediction(
        leagueId,
        match.id,
        home,
        away,
        isKnockout ? advancePick : null,
      );
      if (res.ok) {
        haptics.success();
        toast.success(`Predicción guardada: ${home}-${away}`);
        router.refresh();
      } else {
        haptics.error();
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm",
        live ? "border-transparent border-l-[3px] border-l-live glow-live" : "border-border/60",
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <span className="bg-muted/50 text-muted-foreground rounded-full px-2 py-0.5 font-mono text-3xs tracking-wide uppercase">
          {stageTag} · {match.stadium}
        </span>
        {live ? (
          <span className="text-live font-mono text-2xs font-bold">
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        ) : resolved ? (
          <span className="text-muted-foreground font-mono text-2xs">
            Final
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-2xs">
            {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
          </span>
        )}
      </div>

      {/* Banner de cierre inminente */}
      {imminent ? <Countdown kickoffAt={match.kickoffAt} /> : null}

      {/* Cuerpo: editable vs resultado */}
      {editable ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <TeamLabel flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} />
            <Stepper value={home} onChange={setHome} disabled={pending} />
          </div>
          <div className="flex items-center justify-between">
            <TeamLabel flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} />
            <Stepper value={away} onChange={setAway} disabled={pending} />
          </div>

          {/* Nota de autorrelleno */}
          {!match.prediction && autofill && (
            <p className="text-muted-foreground text-2xs">
              ✦ Pre-rellenado desde otra liga
            </p>
          )}

          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PICKS.map(([h, a]) => {
              const active = h === home && a === away;
              return (
                <button
                  key={`${h}-${a}`}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    haptics.tap();
                    setHome(h);
                    setAway(a);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-2 font-mono text-2xs transition motion-safe:active:scale-[0.97] lg:px-2 lg:py-1",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {h}-{a}
                </button>
              );
            })}
          </div>

          {/* Selector de quién pasa (solo eliminatorias) */}
          {isKnockout && (
            <AdvanceSelector
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              value={advancePick}
              onChange={setAdvancePick}
              disabled={pending}
            />
          )}

          <button
            type="button"
            disabled={pending || !dirty}
            onClick={handleSave}
            className="bg-primary-gradient text-white hover:opacity-90 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-50 shadow-sm shadow-primary/30 motion-safe:active:scale-[0.99] lg:py-2.5"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : null}
            {saved ? (dirty ? "Actualizar predicción" : "Guardada") : "Guardar predicción"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Marcador real */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <TeamLabel flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} />
              {hasScore ? (
                <span
                  className={cn(
                    "font-mono text-2xl font-black tabular-nums",
                    live ? "text-primary" : "text-foreground",
                  )}
                >
                  {match.homeScore}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <TeamLabel flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} />
              {hasScore ? (
                <span
                  className={cn(
                    "font-mono text-2xl font-black tabular-nums",
                    live ? "text-primary" : "text-foreground",
                  )}
                >
                  {match.awayScore}
                </span>
              ) : null}
            </div>
          </div>

          {/* Predicción / puntos */}
          {match.prediction ? (
            <PredictionBadge prediction={match.prediction} match={match} />
          ) : (
            <div className="text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 text-xs font-medium">
              No predijiste este partido
            </div>
          )}

          {/* Comunidad + eventos (solo live/finished) */}
          {resolved || live ? (
            <>
              <CommunityBreakdown matchId={match.id} prediction={match.prediction} />
              {match.externalId ? <MatchEvents matchId={match.id} /> : null}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
