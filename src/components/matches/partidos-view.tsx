"use client";

import { useMemo, useState } from "react";
import { Radio, Trophy, Target, Percent } from "lucide-react";

import type { MatchVM } from "@/lib/queries";
type UserStatsVM = { points: number; rank: number | null; totalPlayers: number; accuracy: number; predictionsCount: number; exactCount: number; currentStreak: number };
import type { MatchFilter } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/matches/match-card";
import { FilterChips } from "@/components/matches/filter-chips";
import { AutoRefresh } from "@/components/matches/auto-refresh";

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent?: "live" | "primary";
}) {
  return (
    <div
      className={cn(
        "mb-3 border-l-2 pl-3",
        accent === "live" ? "border-live" : "border-primary",
      )}
    >
      <h2 className="flex items-center gap-2 text-base font-bold">
        {title}
        <span className="text-muted-foreground font-mono text-xs font-normal">
          {count}
        </span>
      </h2>
    </div>
  );
}

function MatchGrid({ matches, now }: { matches: MatchVM[]; now: Date }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} now={now} />
      ))}
    </div>
  );
}

export function PartidosView({
  matches,
  stats,
}: {
  matches: MatchVM[];
  stats: UserStatsVM;
}) {
  // Tick lento para recalcular estados (locked/imminent) y fechas relativas.
  // El segundero fino vive solo dentro de cada <Countdown/> visible.
  const now = useNow(30_000);
  const [filter, setFilter] = useState<MatchFilter>("all");

  const liveCount = useMemo(
    () => matches.filter((m) => m.status === "LIVE").length,
    [matches],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return matches;
    if (filter === "live") return matches.filter((m) => m.status === "LIVE");
    return matches.filter((m) => m.stage === filter);
  }, [matches, filter]);

  const live = filtered.filter((m) => m.status === "LIVE");
  const upcoming = filtered.filter((m) => m.status === "UPCOMING");
  const finished = filtered
    .filter((m) => m.status === "FINISHED")
    .reverse(); // más recientes primero

  const statCards = [
    { label: "Mis puntos", value: stats.points, icon: Target },
    {
      label: "Mi ranking",
      value: stats.rank ? `#${stats.rank}` : "—",
      sub: stats.rank ? `de ${stats.totalPlayers}` : undefined,
      icon: Trophy,
    },
    { label: "Precisión", value: `${stats.accuracy}%`, icon: Percent },
    { label: "Predicciones", value: stats.predictionsCount, icon: Radio },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={liveCount > 0} />

      {/* Banner EN DIRECTO */}
      {liveCount > 0 ? (
        <div className="border-live/30 bg-live/10 flex items-center gap-3 rounded-xl border px-4 py-3">
          <span className="relative flex size-2.5">
            <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-live relative inline-flex size-2.5 rounded-full" />
          </span>
          <span className="text-sm font-medium">
            {liveCount} {liveCount === 1 ? "partido" : "partidos"} en curso ahora
            mismo
          </span>
          <Badge
            variant="outline"
            className="border-live/40 text-live ml-auto font-mono"
          >
            EN DIRECTO
          </Badge>
        </div>
      ) : null}

      {/* Filtros */}
      <FilterChips value={filter} onChange={setFilter} />

      {/* Secciones */}
      {filtered.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No hay partidos en esta categoría.
        </div>
      ) : (
        <div className="space-y-8">
          {live.length > 0 ? (
            <section>
              <SectionHeader title="En directo" count={live.length} accent="live" />
              <MatchGrid matches={live} now={now} />
            </section>
          ) : null}

          {upcoming.length > 0 ? (
            <section>
              <SectionHeader title="Próximos partidos" count={upcoming.length} />
              <MatchGrid matches={upcoming} now={now} />
            </section>
          ) : null}

          {finished.length > 0 ? (
            <section>
              <SectionHeader title="Resultados" count={finished.length} />
              <MatchGrid matches={finished} now={now} />
            </section>
          ) : null}
        </div>
      )}

      {/* Barra de estadísticas */}
      <div className="border-border bg-card grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-4">
        {statCards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                {label}
              </p>
              <p className="truncate font-mono text-lg font-bold">
                {value}
                {sub ? (
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    {sub}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
