"use client";

import { useMemo, useState } from "react";

import type { PlayerPhysicalAgg } from "@/lib/providers/fifa-physical";

type Board = {
  key: "dist" | "topSpeed" | "sprints";
  title: string;
  icon: string;
  unit: string;
  format: (p: PlayerPhysicalAgg) => string;
};

const BOARDS: Board[] = [
  {
    key: "dist",
    title: "Más distancia",
    icon: "🏃",
    unit: "km",
    format: (p) => `${(p.dist / 1000).toFixed(1)} km`,
  },
  {
    key: "topSpeed",
    title: "Más rápidos",
    icon: "⚡",
    unit: "km/h",
    format: (p) => `${p.topSpeed.toFixed(1)} km/h`,
  },
  {
    key: "sprints",
    title: "Más sprints",
    icon: "💨",
    unit: "",
    format: (p) => `${p.sprints}`,
  },
];

export function PhysicalLeaderboards({
  players,
  teams,
}: {
  players: PlayerPhysicalAgg[];
  teams: string[];
}) {
  const [team, setTeam] = useState<string>("");
  const [pos, setPos] = useState<string>("");

  const filtered = useMemo(
    () =>
      players.filter(
        (p) => (!team || p.team === team) && (!pos || p.pos === pos),
      ),
    [players, team, pos],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="team" className="text-muted-foreground text-sm">
            Equipo
          </label>
          <select
            id="team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="border-border bg-background rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pos" className="text-muted-foreground text-sm">
            Posición
          </label>
          <select
            id="pos"
            value={pos}
            onChange={(e) => setPos(e.target.value)}
            className="border-border bg-background rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="Portero">Portero</option>
            <option value="Defensa">Defensa</option>
            <option value="Centrocampista">Centrocampista</option>
            <option value="Delantero">Delantero</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {BOARDS.map((b) => {
          const top = [...filtered]
            .sort((a, z) => (z[b.key] as number) - (a[b.key] as number))
            .slice(0, 10)
            .filter((p) => (p[b.key] as number) > 0);
          return (
            <section key={b.key} className="card-glass rounded-2xl p-4">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold">
                <span aria-hidden="true">{b.icon}</span> {b.title}
              </h2>
              <ol className="space-y-1.5">
                {top.map((p, i) => (
                  <li key={`${p.name}-${p.team}`} className="flex items-center gap-2.5 text-sm">
                    <span className="text-muted-foreground w-4 shrink-0 text-right font-mono text-xs">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0 font-mono text-2xs">
                      {p.team}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold tabular-nums">
                      {b.format(p)}
                    </span>
                  </li>
                ))}
                {top.length === 0 && (
                  <li className="text-muted-foreground text-xs">Sin datos.</li>
                )}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
