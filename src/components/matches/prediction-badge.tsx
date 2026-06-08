import { Check, Target } from "lucide-react";

import type { PredictionVM, MatchBase } from "@/lib/queries";
import { cn } from "@/lib/utils";

function formatPts(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

export function PredictionBadge({
  prediction,
  match,
  className,
}: {
  prediction: PredictionVM;
  match?: Pick<MatchBase, "homeTeam" | "awayTeam" | "advanced">;
  className?: string;
}) {
  const score = `${prediction.homeScore}-${prediction.awayScore}`;
  const { points, exact } = prediction;

  if (points === null) {
    return (
      <div
        className={cn(
          "text-muted-foreground bg-muted flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
          className,
        )}
      >
        <Target className="size-3.5 shrink-0" />
        Tu pred: <span className="text-foreground font-mono">{score}</span>
        {match && prediction.advancePick && (
          <span className="opacity-60">
            · pasa {prediction.advancePick === "HOME" ? match.homeTeam : match.awayTeam}
          </span>
        )}
      </div>
    );
  }

  const tone = exact
    ? "border-success/40 bg-success/10 text-success"
    : points > 0
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-border bg-muted text-muted-foreground";

  const label = exact ? "Exacto" : points > 0 ? "Parcial" : "Fallaste";

  // Show who the user predicted to advance vs who actually advanced
  const advanceNote =
    match && prediction.advancePick && match.advanced
      ? prediction.advancePick === match.advanced
        ? `✓ ${prediction.advancePick === "HOME" ? match.homeTeam : match.awayTeam} pasó`
        : `✗ pasó ${match.advanced === "HOME" ? match.homeTeam : match.awayTeam}`
      : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {points > 0 ? <Check className="size-3.5 shrink-0" /> : <Target className="size-3.5 shrink-0" />}
        <span className="font-mono">{score}</span>
        <span className="opacity-70">·</span>
        <span>{label}</span>
        <span className="ml-auto font-mono font-bold">
          {points > 0 ? `+${formatPts(points)}` : "0"} pts
        </span>
      </div>
      {advanceNote && (
        <span className="opacity-70 pl-5 text-2xs">{advanceNote}</span>
      )}
    </div>
  );
}
