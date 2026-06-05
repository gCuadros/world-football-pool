"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Target, ArrowLeft, CalendarDays, Rows3 } from "lucide-react";

import type { MatchVM } from "@/lib/queries";
import type { MatchFilter } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { AutoRefresh } from "@/components/matches/auto-refresh";
import { FilterChips } from "@/components/matches/filter-chips";
import { PredictionCard } from "@/components/predictions/prediction-card";

type Autofills = Record<string, { homeScore: number; awayScore: number }>;
type TabId = "pending" | "saved" | "locked";
type ViewMode = "tabs" | "calendar";

const TAB_LABELS: Record<TabId, string> = {
  pending: "Pendientes",
  saved: "Guardadas",
  locked: "Cerradas",
};

const TZ = "Europe/Madrid";

function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
}

const DAY_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

function formatDay(key: string): string {
  return DAY_FMT.format(new Date(`${key}T12:00:00Z`));
}

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
  const [viewMode, setViewMode] = useState<ViewMode>("tabs");

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

  const activeTab: TabId = counts[tab] > 0 ? tab : (
    (["pending", "saved", "locked"] as TabId[]).find((t) => counts[t] > 0) ?? tab
  );

  const visibleMatches = { pending, saved, locked }[activeTab];

  // Vista calendario: todos los partidos filtrados, agrupados por día.
  const byDay = useMemo(() => {
    const map = new Map<string, MatchVM[]>();
    for (const m of filtered) {
      const key = dateKey(m.kickoffAt);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <AutoRefresh enabled={liveCount > 0} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/liga/${leagueId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Target className="text-primary size-5" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">Mis Predicciones</h1>
          <p className="text-muted-foreground text-sm truncate">{leagueName}</p>
        </div>

        {/* Toggle de vista */}
        <div className="border-border flex gap-0.5 rounded-lg border p-0.5">
          <button
            onClick={() => setViewMode("tabs")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "tabs"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Pestañas"
          >
            <Rows3 className="size-3.5" />
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "rounded p-1.5 transition-colors",
              viewMode === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Calendario"
          >
            <CalendarDays className="size-3.5" />
          </button>
        </div>
      </div>

      <FilterChips value={filter} onChange={setFilter} />

      {/* ── Vista Pestañas ──────────────────────────────────────────────── */}
      {viewMode === "tabs" && (
        <>
          <div className="border-border flex gap-1 rounded-xl border p-1">
            {(["pending", "saved", "locked"] as TabId[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TAB_LABELS[t]}
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                    activeTab === t
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>

          {visibleMatches.length === 0 ? (
            <EmptyState text={
              filtered.length === 0
                ? "No hay partidos en esta categoría."
                : `No hay partidos en "${TAB_LABELS[activeTab]}".`
            } />
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
        </>
      )}

      {/* ── Vista Calendario ─────────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <>
          {byDay.size === 0 ? (
            <EmptyState text="No hay partidos en esta categoría." />
          ) : (
            <div className="space-y-8">
              {Array.from(byDay.entries()).map(([key, dayMatches]) => (
                <section key={key}>
                  <div className="border-primary mb-3 border-l-[3px] pl-3">
                    <h2 className="font-mono text-sm font-bold capitalize">{formatDay(key)}</h2>
                    <p className="text-muted-foreground text-xs">
                      {dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dayMatches.map((m) => (
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
      {text}
    </div>
  );
}
