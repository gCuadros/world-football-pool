import { Check, Target, X } from "lucide-react";

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
          "text-muted-foreground bg-muted/60 border-border/50 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium",
          className,
        )}
      >
        <Target className="size-3.5 shrink-0 opacity-60" />
        <span>Tu pred:</span>
        <span className="text-foreground font-mono font-semibold">{score}</span>
        {match && prediction.advancePick && (
          <span className="text-muted-foreground/70 ml-auto">
            pasa {prediction.advancePick === "HOME" ? match.homeTeam : match.awayTeam}
          </span>
        )}
      </div>
    );
  }

  const advanceNote =
    match && prediction.advancePick && match.advanced
      ? prediction.advancePick === match.advanced
        ? `✓ ${prediction.advancePick === "HOME" ? match.homeTeam : match.awayTeam} pasó`
        : `✗ pasó ${match.advanced === "HOME" ? match.homeTeam : match.awayTeam}`
      : null;

  if (exact) {
    return (
      <div className={cn("overflow-hidden rounded-xl", className)}>
        <div className="bg-success flex items-center gap-2 px-3 py-2 text-white">
          <Check className="size-3.5 shrink-0" strokeWidth={2.5} />
          <span className="font-mono font-bold tracking-tight">{score}</span>
          <span className="text-white/80 text-xs">· Exacto</span>
          <span className="ml-auto font-mono text-sm font-black">+{formatPts(points)} pts</span>
        </div>
        {advanceNote && (
          <div className="bg-success/10 text-success border-t border-success/20 px-3 py-1 text-2xs font-medium">
            {advanceNote}
          </div>
        )}
      </div>
    );
  }

  if (points > 0) {
    return (
      <div className={cn("overflow-hidden rounded-xl", className)}>
        <div className="bg-primary/10 border-primary/25 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
          <Check className="text-primary size-3.5 shrink-0" strokeWidth={2.5} />
          <span className="text-primary font-mono font-semibold">{score}</span>
          <span className="text-primary/70">· Parcial</span>
          <span className="text-primary ml-auto font-mono font-black">+{formatPts(points)} pts</span>
        </div>
        {advanceNote && (
          <div className="text-primary/70 border-primary/15 border-t bg-primary/5 px-3 py-1 text-2xs font-medium">
            {advanceNote}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl", className)}>
      <div className="bg-muted/60 border-border/60 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
        <X className="text-muted-foreground size-3.5 shrink-0" strokeWidth={2.5} />
        <span className="text-muted-foreground font-mono">{score}</span>
        <span className="text-muted-foreground/70">· Fallaste</span>
        <span className="text-muted-foreground ml-auto font-mono font-semibold">0 pts</span>
      </div>
      {advanceNote && (
        <div className="text-muted-foreground/70 border-border/40 border-t bg-muted/40 px-3 py-1 text-2xs font-medium">
          {advanceNote}
        </div>
      )}
    </div>
  );
}
