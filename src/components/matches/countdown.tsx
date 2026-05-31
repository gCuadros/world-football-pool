"use client";

import { Timer } from "lucide-react";

import { useNow } from "@/hooks/use-now";
import { PREDICTION_LOCK_MINUTES, secondsUntilLock } from "@/lib/scoring";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const LOCK_WINDOW_SECONDS = PREDICTION_LOCK_MINUTES * 60;

/**
 * Banner ámbar de cuenta regresiva hasta el cierre de predicciones
 * (kickoff − 15 min). Solo tiene sentido mostrarlo cuando el cierre es inminente.
 */
export function Countdown({
  kickoffAt,
  className,
}: {
  kickoffAt: string;
  className?: string;
}) {
  const now = useNow(1000);
  const seconds = secondsUntilLock(new Date(kickoffAt), now);

  if (seconds <= 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
          className,
        )}
      >
        <Timer className="size-3.5" />
        Predicciones cerradas
      </div>
    );
  }

  const pct = Math.min(100, (seconds / LOCK_WINDOW_SECONDS) * 100);

  return (
    <div
      className={cn(
        "border-warning/40 bg-warning/10 space-y-1.5 rounded-lg border px-3 py-2",
        className,
      )}
    >
      <div className="text-warning flex items-center gap-2 text-xs font-semibold">
        <Timer className="size-3.5" />
        <span>Cierra en</span>
        <span className="ml-auto font-mono tabular-nums">
          {formatDuration(seconds)}
        </span>
      </div>
      <div className="bg-warning/20 h-1 overflow-hidden rounded-full">
        <div
          className="bg-warning h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** ¿El cierre es inminente? (≤ 15 min para el deadline y aún abierto). */
export function isLockImminent(kickoffAt: string, now: Date): boolean {
  const seconds = secondsUntilLock(new Date(kickoffAt), now);
  return seconds > 0 && seconds <= LOCK_WINDOW_SECONDS;
}
