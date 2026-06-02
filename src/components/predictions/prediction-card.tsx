"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { MatchVM } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { savePrediction } from "@/app/(app)/predicciones/actions";
import { Countdown, isLockImminent } from "@/components/matches/countdown";
import { PredictionBadge } from "@/components/matches/prediction-badge";
import { CommunityBreakdown } from "@/components/predictions/community-breakdown";
import { TeamCrest } from "@/components/matches/team-crest";
import { MatchEvents } from "@/components/matches/match-events";

const QUICK_PICKS: [number, number][] = [
  [1, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [0, 0],
  [0, 1],
];

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
    <div className="flex min-w-0 items-center gap-2.5">
      <TeamCrest crest={crest} flag={flag} name={name} size={24} className="shrink-0" />
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
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
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex size-7 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
        aria-label="Restar"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-7 text-center font-mono text-xl font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= 20}
        onClick={() => onChange(Math.min(20, value + 1))}
        className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex size-7 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
        aria-label="Sumar"
      >
        <Plus className="size-3.5" />
      </button>
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

  // Pre-rellena con predicción existente en la liga, o con autorrelleno de otra liga.
  const initial = match.prediction ?? autofill ?? { homeScore: 0, awayScore: 0 };
  const [home, setHome] = useState(initial.homeScore);
  const [away, setAway] = useState(initial.awayScore);

  const saved = match.prediction;
  const dirty =
    !saved || saved.homeScore !== home || saved.awayScore !== away;

  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  function handleSave() {
    startTransition(async () => {
      const res = await savePrediction(leagueId, match.id, home, away);
      if (res.ok) {
        toast.success(`Predicción guardada: ${home}-${away}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4",
        live ? "border-live/40" : "border-border",
      )}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
          {stageTag} · {match.stadium}
        </span>
        {live ? (
          <span className="text-live font-mono text-[11px] font-bold">
            {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
          </span>
        ) : resolved ? (
          <span className="text-muted-foreground font-mono text-[11px]">
            Final
          </span>
        ) : (
          <span className="text-muted-foreground font-mono text-[11px]">
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
            <p className="text-muted-foreground text-[11px]">
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
                    setHome(h);
                    setAway(a);
                  }}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
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

          <button
            type="button"
            disabled={pending || !dirty}
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
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
                    "font-mono text-xl font-bold tabular-nums",
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
                    "font-mono text-xl font-bold tabular-nums",
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
            <PredictionBadge prediction={match.prediction} />
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
