import { Check, Target } from "lucide-react";

import type { PredictionVM } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Muestra la predicción del usuario y, si el partido terminó, los puntos. */
export function PredictionBadge({
  prediction,
  className,
}: {
  prediction: PredictionVM;
  className?: string;
}) {
  const score = `${prediction.homeScore}-${prediction.awayScore}`;
  const { points } = prediction;

  if (points === null) {
    return (
      <div
        className={cn(
          "text-muted-foreground bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
          className,
        )}
      >
        <Target className="size-3.5" />
        Tu pred: <span className="text-foreground font-mono">{score}</span>
      </div>
    );
  }

  const tone =
    points === 3
      ? "border-success/40 bg-success/10 text-success"
      : points === 1
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-muted text-muted-foreground";

  const label = points === 3 ? "Exacto" : points === 1 ? "Resultado" : "Fallaste";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {points > 0 ? <Check className="size-3.5" /> : <Target className="size-3.5" />}
      <span className="font-mono">{score}</span>
      <span className="opacity-70">·</span>
      <span>{label}</span>
      <span className="ml-auto font-mono font-bold">
        {points > 0 ? `+${points}` : "0"} pts
      </span>
    </div>
  );
}
