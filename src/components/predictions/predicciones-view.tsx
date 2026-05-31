"use client";

import { useMemo, useState } from "react";

import type { MatchVM, UserStatsVM } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AutoRefresh } from "@/components/matches/auto-refresh";
import { PredictionCard } from "@/components/predictions/prediction-card";

type PredFilter = "all" | "pending" | "hits" | "misses";

export function PrediccionesView({
  matches,
  stats,
  userName,
  userInitials,
}: {
  matches: MatchVM[];
  stats: UserStatsVM;
  userName: string;
  userInitials: string;
}) {
  // Tick lento (el segundero fino vive en cada <Countdown/> visible).
  const now = useNow(30_000);
  const [filter, setFilter] = useState<PredFilter>("all");

  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  const counts = useMemo(() => {
    let pending = 0;
    let hits = 0;
    let misses = 0;
    for (const m of matches) {
      if (m.status === "UPCOMING" && !m.locked) pending++;
      if (m.status === "FINISHED" && m.prediction) {
        if ((m.prediction.points ?? 0) > 0) hits++;
        else misses++;
      }
    }
    return { all: matches.length, pending, hits, misses };
  }, [matches]);

  const filtered = useMemo(() => {
    const subset = matches.filter((m) => {
      if (filter === "all") return true;
      if (filter === "pending") return m.status === "UPCOMING" && !m.locked;
      if (filter === "hits")
        return m.status === "FINISHED" && (m.prediction?.points ?? 0) > 0;
      if (filter === "misses")
        return (
          m.status === "FINISHED" &&
          m.prediction != null &&
          (m.prediction.points ?? 0) === 0
        );
      return true;
    });

    // Orden por relevancia: en vivo → próximos (asc) → terminados (desc).
    const rank = (m: MatchVM) =>
      m.status === "LIVE" ? 0 : m.status === "UPCOMING" ? 1 : 2;
    return subset.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      const ta = new Date(a.kickoffAt).getTime();
      const tb = new Date(b.kickoffAt).getTime();
      return ra === 2 ? tb - ta : ta - tb;
    });
  }, [matches, filter]);

  const filters: { value: PredFilter; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: counts.all },
    { value: "pending", label: "Pendientes", count: counts.pending },
    { value: "hits", label: "Aciertos", count: counts.hits },
    { value: "misses", label: "Fallos", count: counts.misses },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={liveCount > 0} />

      {/* Header del usuario */}
      <div className="border-border bg-card flex flex-wrap items-center gap-4 rounded-2xl border p-4">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-primary-foreground font-mono text-base">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{userName}</h2>
          <p className="text-muted-foreground text-xs">
            {stats.rank ? `Puesto #${stats.rank} de ${stats.totalPlayers}` : "Sin ranking"}
          </p>
        </div>
        <div className="flex w-full justify-between gap-4 sm:ml-auto sm:w-auto sm:justify-normal sm:gap-6">
          {[
            { label: "Puntos", value: stats.points },
            { label: "Precisión", value: `${stats.accuracy}%` },
            { label: "Aciertos", value: stats.exactCount + counts.hits },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono text-xl font-bold">{s.value}</p>
              <p className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("font-mono text-[10px]", active ? "opacity-80" : "opacity-60")}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No hay predicciones en esta categoría.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <PredictionCard key={m.id} match={m} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
