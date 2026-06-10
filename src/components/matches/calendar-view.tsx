"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDots, CaretDown } from "@phosphor-icons/react";

import type { MatchBase } from "@/lib/queries";
import { useNow } from "@/hooks/use-now";
import { AutoRefresh } from "@/components/matches/auto-refresh";
import { MatchCard } from "@/components/matches/match-card";
import type { MatchVM } from "@/lib/queries";

// ── helpers ──────────────────────────────────────────────────────────────────

const TZ = "Europe/Madrid";

/** YYYY-MM-DD en zona Madrid (para agrupar). */
function dateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ }); // sv-SE da ISO
}

const DAY_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

function formatDay(key: string): string {
  // key = "2026-06-12"
  // Añadir mediodía UTC para evitar desfases de zona al construir Date.
  return DAY_FMT.format(new Date(`${key}T12:00:00Z`));
}

function toVM(m: MatchBase): MatchVM {
  return { ...m, prediction: null, locked: true };
}

// ── component ─────────────────────────────────────────────────────────────────

export function CalendarView({ matches }: { matches: MatchBase[] }) {
  const now = useNow(30_000);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const liveCount = useMemo(
    () => matches.filter((m) => m.status === "LIVE").length,
    [matches],
  );

  // Lista de equipos únicos, ordenados.
  const teams = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      set.add(m.homeTeam);
      set.add(m.awayTeam);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [matches]);

  // Filtrar por equipo.
  const filtered = useMemo(() => {
    if (!selectedTeam) return matches;
    return matches.filter(
      (m) => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam,
    );
  }, [matches, selectedTeam]);

  // Agrupar por día (en zona Madrid).
  const byDay = useMemo(() => {
    const map = new Map<string, MatchBase[]>();
    for (const m of filtered) {
      const key = dateKey(m.kickoffAt);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    // Map mantiene orden de inserción; los matches vienen ordenados por kickoffAt.
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={liveCount > 0} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDots className="text-primary size-5" />
          <div>
            <h1 className="text-xl font-bold">Calendario</h1>
            <p className="text-muted-foreground text-sm">
              {matches.length} partidos
            </p>
          </div>
        </div>

        {/* Selector de vista alternativa */}
        <Link
          href="/resultados"
          className="text-muted-foreground hover:text-foreground rounded-lg border border-dashed px-3 py-1.5 text-xs transition-colors"
        >
          Vista lista
        </Link>
      </div>

      {/* Filtro de equipo */}
      <div className="relative max-w-xs">
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="border-border bg-card text-foreground w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm"
        >
          <option value="">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <CaretDown className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2" />
      </div>

      {byDay.size === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No hay partidos para este equipo.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byDay.entries()).map(([key, dayMatches]) => (
            <section key={key}>
              {/* Cabecera de día */}
              <div className="border-primary mb-3 border-l-[3px] pl-3">
                <h2 className="font-mono text-sm font-bold capitalize">
                  {formatDay(key)}
                </h2>
                <p className="text-muted-foreground text-xs">
                  {dayMatches.length}{" "}
                  {dayMatches.length === 1 ? "partido" : "partidos"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dayMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={toVM(m)}
                    now={now}
                    publicMode
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
