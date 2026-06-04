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

type TabId = "pending" | "saved" | "locked";

const TAB_LABELS: Record<TabId, string> = {
  pending: "Pendientes",
  saved: "Guardadas",
  locked: "Cerradas",
};

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
  const [tab, setTab] = useState<TabId>("pending");

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

  const counts: Record<TabId, number> = { pending: pending.length, saved: saved.length, locked: locked.length };

  // Si la pestaña activa está vacía pero hay contenido en otra, ir a la primera con contenido.
  const activeTab: TabId = counts[tab] > 0 ? tab : (
    (["pending", "saved", "locked"] as TabId[]).find((t) => counts[t] > 0) ?? tab
  );

  const visibleMatches = { pending, saved, locked }[activeTab];

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

      {/* Tab bar */}
      <div className="border-border flex gap-1 rounded-xl border p-1">
        {(["pending", "saved", "locked"] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {TAB_LABELS[t]}
            <span
              className={[
                "rounded px-1.5 py-0.5 font-mono text-[10px]",
                activeTab === t
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted",
              ].join(" ")}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {visibleMatches.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          {filtered.length === 0
            ? "No hay partidos en esta categoría."
            : `No hay partidos en "${TAB_LABELS[activeTab]}".`}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMatches.map((m) => (
            <PredictionCard
              key={m.id}
              match={m}
              now={now}
              leagueId={leagueId}
              autofill={activeTab === "pending" ? (autofills[m.id] ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
