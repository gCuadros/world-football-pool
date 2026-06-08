"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Users } from "lucide-react";

import type { CommunityDistribution, PredictionVM } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function CommunityBreakdown({
  matchId,
  prediction,
}: {
  matchId: string;
  prediction: PredictionVM | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CommunityDistribution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myLabel = prediction
    ? `${prediction.homeScore}-${prediction.awayScore}`
    : null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/predictions/community/${matchId}`);
        if (!res.ok) throw new Error("No disponible");
        setData(await res.json());
      } catch {
        setError("No se pudo cargar la distribución.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="border-border border-t pt-3">
      <button
        type="button"
        onClick={toggle}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-xs font-medium transition-colors"
      >
        <Users className="size-3.5" />
        Predicciones de la comunidad
        {data ? (
          <span className="font-mono">· {data.total} votos</span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" /> Cargando…
            </div>
          ) : error ? (
            <p className="text-muted-foreground py-2 text-xs">{error}</p>
          ) : data && data.total > 0 ? (
            <>
              {data.scores.map((s) => {
                const mine = s.label === myLabel;
                return (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "font-mono",
                          mine ? "text-primary font-bold" : "text-foreground",
                        )}
                      >
                        {s.label}
                        {mine ? (
                          <span className="bg-primary/10 text-primary ml-1.5 rounded px-1 py-0.5 text-3xs">
                            Tu pred
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {s.pct}%
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          mine ? "bg-primary" : "bg-muted-foreground/40",
                        )}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="text-muted-foreground flex justify-between pt-1 font-mono text-3xs">
                <span>Local {data.results.home}%</span>
                <span>Empate {data.results.draw}%</span>
                <span>Visitante {data.results.away}%</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground py-2 text-xs">
              Aún no hay predicciones registradas.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
