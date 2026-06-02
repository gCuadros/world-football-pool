"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Target, ArrowLeft } from "lucide-react";

import type { MatchVM } from "@/lib/queries";
import type { MatchFilter } from "@/lib/labels";
import { useNow } from "@/hooks/use-now";
import { AutoRefresh } from "@/components/matches/auto-refresh";
import { FilterChips } from "@/components/matches/filter-chips";
import { PredictionCard } from "@/components/predictions/prediction-card";

type Autofills = Record<string, { homeScore: number; awayScore: number }>;

export function PrediccionesLigaView({
  leagueId,
  leagueName,
  matches,
  autofills,
}: {
  leagueId: string;
  leagueName: string;
  matches: MatchVM[];
  autofills: Autofills;
}) {
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

  const pending = filtered.filter((m) => m.status === "UPCOMING" && !m.locked && !m.prediction);
  const saved = filtered.filter((m) => m.status === "UPCOMING" && !m.locked && m.prediction);
  const locked = filtered.filter((m) => m.status !== "UPCOMING" || m.locked);

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={liveCount > 0} />

      <div className="flex items-center gap-3">
        <Link
          href={`/liga/${leagueId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Target className="text-primary size-5" />
        <div>
          <h1 className="text-xl font-bold leading-tight">Mis Predicciones</h1>
          <p className="text-muted-foreground text-sm">{leagueName}</p>
        </div>
      </div>

      <FilterChips value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No hay partidos en esta categoría.
        </div>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section>
              <SectionHeader
                title="Pendientes"
                count={pending.length}
                note="Sin predicción"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((m) => (
                  <PredictionCard
                    key={m.id}
                    match={m}
                    now={now}
                    leagueId={leagueId}
                    autofill={autofills[m.id] ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          {saved.length > 0 && (
            <section>
              <SectionHeader title="Guardadas" count={saved.length} />
              <div className="grid gap-3 sm:grid-cols-2">
                {saved.map((m) => (
                  <PredictionCard
                    key={m.id}
                    match={m}
                    now={now}
                    leagueId={leagueId}
                    autofill={null}
                  />
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section>
              <SectionHeader title="Cerradas / Resultados" count={locked.length} />
              <div className="grid gap-3 sm:grid-cols-2">
                {locked.map((m) => (
                  <PredictionCard
                    key={m.id}
                    match={m}
                    now={now}
                    leagueId={leagueId}
                    autofill={null}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  note,
}: {
  title: string;
  count: number;
  note?: string;
}) {
  return (
    <div className="border-primary mb-3 border-l-2 pl-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        {title}
        <span className="text-muted-foreground font-mono text-xs font-normal">{count}</span>
        {note && (
          <span className="text-muted-foreground rounded bg-orange-500/10 px-1.5 py-0.5 font-mono text-[10px] text-orange-500">
            {note}
          </span>
        )}
      </h2>
    </div>
  );
}
