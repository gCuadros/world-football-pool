"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";

import type { MatchBase } from "@/lib/queries";
import type { MatchFilter } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/matches/match-card";
import { FilterChips } from "@/components/matches/filter-chips";
import { AutoRefresh } from "@/components/matches/auto-refresh";
import type { MatchVM } from "@/lib/queries";

function toVM(m: MatchBase): MatchVM {
  return { ...m, prediction: null, locked: true };
}

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
        "border-primary mb-3 border-l-[3px] pl-3",
        accent === "live" && "border-live",
      )}
    >
      <h2 className="flex items-center gap-2 font-mono text-base font-bold">
        {title}
        <span className="text-muted-foreground text-xs font-normal">{count}</span>
      </h2>
    </div>
  );
}

export function ResultadosView({ matches }: { matches: MatchBase[] }) {
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
  const finished = [...filtered.filter((m) => m.status === "FINISHED")].reverse();

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={liveCount > 0} />

      <div className="flex items-center gap-3">
        <Radio className="text-primary size-5" />
        <h1 className="text-xl font-bold">Resultados</h1>
        {liveCount > 0 && (
          <Badge variant="outline" className="border-live/40 text-live font-mono ml-auto">
            {liveCount} EN DIRECTO
          </Badge>
        )}
      </div>

      {liveCount > 0 && (
        <div className="border-live/30 bg-live/10 flex items-center gap-3 rounded-xl border px-4 py-3">
          <span className="relative flex size-2.5">
            <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-live relative inline-flex size-2.5 rounded-full" />
          </span>
          <span className="text-sm font-medium">
            {liveCount} {liveCount === 1 ? "partido" : "partidos"} en curso
          </span>
        </div>
      )}

      <FilterChips value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No hay partidos en esta categoría.
        </div>
      ) : (
        <div className="space-y-8">
          {live.length > 0 && (
            <section>
              <SectionHeader title="En directo" count={live.length} accent="live" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {live.map((m) => (
                  <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />
                ))}
              </div>
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <SectionHeader title="Próximos" count={upcoming.length} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((m) => (
                  <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />
                ))}
              </div>
            </section>
          )}
          {finished.length > 0 && (
            <section>
              <SectionHeader title="Resultados" count={finished.length} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {finished.map((m) => (
                  <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
