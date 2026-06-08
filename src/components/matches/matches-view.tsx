"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, List, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

import type { MatchBase, MatchVM } from "@/lib/queries";
import type { MatchFilter } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "@/components/matches/match-card";
import { FilterChips } from "@/components/matches/filter-chips";
import { AutoRefresh } from "@/components/matches/auto-refresh";

// ── helpers ──────────────────────────────────────────────────────────────────

function toVM(m: MatchBase): MatchVM {
  return { ...m, prediction: null, locked: true };
}

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

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent?: "live";
}) {
  return (
    <div className={cn("border-primary mb-3 border-l-[3px] pl-3", accent === "live" && "border-live")}>
      <h2 className="flex items-center gap-2 font-mono text-sm font-bold">
        {title}
        <span className="text-muted-foreground text-xs font-normal">{count}</span>
      </h2>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

type View = "calendar" | "list";

export function MatchesView({
  matches,
  favoriteTeam,
}: {
  matches: MatchBase[];
  favoriteTeam?: string | null;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const now = useNow(30_000);
  const [view, setView] = useState<View>("calendar");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [stageFilter, setStageFilter] = useState<MatchFilter>("all");
  const [showPast, setShowPast] = useState(false);

  const liveCount = useMemo(
    () => matches.filter((m) => m.status === "LIVE").length,
    [matches],
  );

  const teams = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      set.add(m.homeTeam);
      set.add(m.awayTeam);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [matches]);

  const byTeam = useMemo(
    () =>
      selectedTeam
        ? matches.filter((m) => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam)
        : matches,
    [matches, selectedTeam],
  );

  const listFiltered = useMemo(() => {
    if (stageFilter === "all") return byTeam;
    if (stageFilter === "live") return byTeam.filter((m) => m.status === "LIVE");
    return byTeam.filter((m) => m.stage === stageFilter);
  }, [byTeam, stageFilter]);

  const todayKey = dateKey(now.toISOString());

  const pastDayCount = useMemo(() => {
    const days = new Set<string>();
    for (const m of byTeam) {
      if (m.status === "FINISHED" && dateKey(m.kickoffAt) < todayKey) {
        days.add(dateKey(m.kickoffAt));
      }
    }
    return days.size;
  }, [byTeam, todayKey]);

  const calendarMatches = useMemo(
    () =>
      showPast
        ? byTeam
        : byTeam.filter(
            (m) => m.status !== "FINISHED" || dateKey(m.kickoffAt) >= todayKey,
          ),
    [byTeam, showPast, todayKey],
  );

  const STATUS_PRIORITY: Record<string, number> = { LIVE: 0, UPCOMING: 1, FINISHED: 2 };

  const byDay = useMemo(() => {
    const map = new Map<string, MatchBase[]>();
    for (const m of calendarMatches) {
      const key = dateKey(m.kickoffAt);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (STATUS_PRIORITY[a.status] ?? 2) - (STATUS_PRIORITY[b.status] ?? 2) ||
          a.kickoffAt.localeCompare(b.kickoffAt),
      );
    }
    return map;
  }, [calendarMatches]);

  const live = listFiltered.filter((m) => m.status === "LIVE");
  const upcoming = listFiltered.filter((m) => m.status === "UPCOMING");
  const finished = [...listFiltered.filter((m) => m.status === "FINISHED")].reverse();

  return (
    <div className="space-y-5">
      <AutoRefresh enabled={liveCount > 0} />

      {/* Toggle vista */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="border-border flex gap-0.5 rounded-xl border p-1">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-3.5" />
            Calendario
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-3.5" />
            Lista
          </button>
        </div>

        {liveCount > 0 && (
          <Badge variant="outline" className="border-live/40 text-live font-mono">
            {liveCount} EN DIRECTO
          </Badge>
        )}

        <button
          onClick={() => startRefresh(() => { router.refresh(); })}
          disabled={refreshing}
          className="text-muted-foreground hover:text-foreground ml-auto transition-colors disabled:opacity-40"
          title="Actualizar"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Filtros de equipo */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Chip "Todos" — siempre visible, activo cuando no hay filtro */}
        <button
          onClick={() => setSelectedTeam("")}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            selectedTeam === ""
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          Todos
        </button>

        {/* Chip del equipo favorito (solo si el usuario está logueado y tiene favorito) */}
        {favoriteTeam && (
          <button
            onClick={() => setSelectedTeam((t) => (t === favoriteTeam ? "" : favoriteTeam))}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selectedTeam === favoriteTeam
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            ⭐ {favoriteTeam}
          </button>
        )}

        {/* Selector completo de equipo */}
        <div className="relative">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="border-border bg-card text-foreground appearance-none rounded-full border py-1.5 pl-3 pr-7 text-xs"
          >
            <option value="">Todos los equipos</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2" />
        </div>
      </div>

      {/* ── Vista Calendario ────────────────────────────────────────────────── */}
      {view === "calendar" && (
        <>
          {liveCount > 0 && (
            <div className="border-live/30 bg-live/10 flex items-center gap-3 rounded-xl border px-4 py-3">
              <span className="relative flex size-2.5 shrink-0">
                <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-live relative inline-flex size-2.5 rounded-full" />
              </span>
              <span className="text-sm font-medium">
                {liveCount} {liveCount === 1 ? "partido" : "partidos"} en curso
              </span>
            </div>
          )}

          {/* Botón para mostrar jornadas anteriores */}
          {!showPast && pastDayCount > 0 && (
            <button
              onClick={() => setShowPast(true)}
              className="border-border text-muted-foreground hover:border-primary/40 hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors"
            >
              <ChevronUp className="size-4" />
              Ver {pastDayCount} {pastDayCount === 1 ? "jornada anterior" : "jornadas anteriores"}
            </button>
          )}

          {byDay.size === 0 ? (
            <EmptyState />
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
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {dayMatches.map((m) => (
                      <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Ocultar anteriores cuando están visibles */}
          {showPast && pastDayCount > 0 && (
            <button
              onClick={() => setShowPast(false)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1.5 py-2 text-xs transition-colors"
            >
              <ChevronDown className="size-3.5" />
              Ocultar anteriores
            </button>
          )}
        </>
      )}

      {/* ── Vista Lista ──────────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          <FilterChips value={stageFilter} onChange={setStageFilter} />

          {listFiltered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              {live.length > 0 && (
                <section>
                  <SectionHeader title="En directo" count={live.length} accent="live" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {live.map((m) => <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />)}
                  </div>
                </section>
              )}
              {upcoming.length > 0 && (
                <section>
                  <SectionHeader title="Próximos" count={upcoming.length} />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {upcoming.map((m) => <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />)}
                  </div>
                </section>
              )}
              {finished.length > 0 && (
                <section>
                  <SectionHeader title="Resultados" count={finished.length} />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {finished.map((m) => <MatchCard key={m.id} match={toVM(m)} now={now} publicMode />)}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
      No hay partidos para mostrar.
    </div>
  );
}
