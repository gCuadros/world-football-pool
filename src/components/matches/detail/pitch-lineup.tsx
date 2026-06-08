"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ui/segmented";
import { TeamCrest } from "@/components/matches/team-crest";
import type { TeamLineup, LineupPlayer } from "@/lib/providers/api-football";

type View = "pitch" | "list";

function parseGrid(grid: string | null): { row: number; col: number } | null {
  if (!grid) return null;
  const [r, c] = grid.split(":");
  const row = parseInt(r, 10);
  const col = parseInt(c, 10);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

function groupByRow(players: LineupPlayer[]): Map<number, LineupPlayer[]> {
  const rows = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const g = parseGrid(p.grid);
    const row = g?.row ?? 0;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(p);
  }
  for (const rowPlayers of rows.values()) {
    rowPlayers.sort((a, b) => (parseGrid(a.grid)?.col ?? 0) - (parseGrid(b.grid)?.col ?? 0));
  }
  return rows;
}

function lastName(name: string): string {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1];
}

function PlayerChip({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-2xs font-bold text-white shadow backdrop-blur-sm">
        {player.number ?? "?"}
      </div>
      <span className="max-w-[52px] truncate text-center text-3xs font-medium leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
        {lastName(player.name)}
      </span>
    </div>
  );
}

function PitchHalf({
  lineup,
  flipped,
}: {
  lineup: TeamLineup;
  flipped: boolean;
}) {
  const rows = groupByRow(lineup.startXI);
  const rowKeys = Array.from(rows.keys()).sort((a, b) => a - b);
  // flipped=false (home, bottom half): strikers near center → display highest rows first
  // flipped=true  (away, top half):  GK near top → display row 1 first
  const displayRows = flipped ? rowKeys : [...rowKeys].reverse();

  return (
    <div className="flex flex-1 flex-col justify-around py-3">
      {displayRows.map((row) => (
        <div key={row} className="flex items-center justify-around px-3">
          {rows.get(row)!.map((p, i) => (
            <PlayerChip key={i} player={p} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PitchView({ lineups }: { lineups: TeamLineup[] }) {
  const [home, away] = lineups;
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ background: "#1a5c2a" }}>
      {/* Pitch lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Boundary */}
        <rect x="5" y="4" width="90" height="192" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />
        {/* Center line */}
        <line x1="5" y1="100" x2="95" y2="100" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />
        {/* Center circle */}
        <circle cx="50" cy="100" r="12" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />
        <circle cx="50" cy="100" r="1" fill="white" fillOpacity="0.3" />
        {/* Home penalty area */}
        <rect x="25" y="166" width="50" height="26" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
        <rect x="37" y="178" width="26" height="14" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
        {/* Away penalty area */}
        <rect x="25" y="8" width="50" height="26" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
        <rect x="37" y="8" width="26" height="14" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="0.8" />
      </svg>

      <div className="relative flex flex-col" style={{ minHeight: 380 }}>
        {/* Away half (top) */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-1.5 px-3 pt-2.5">
            <TeamCrest crest={away.teamLogo} flag={away.teamFlag} name={away.team} size={14} />
            <span className="truncate text-3xs font-semibold text-white/80">{away.team}</span>
            {away.formation && (
              <span className="ml-auto font-mono text-3xs text-white/40">{away.formation}</span>
            )}
          </div>
          <PitchHalf lineup={away} flipped={true} />
        </div>

        {/* Home half (bottom) */}
        <div className="flex flex-1 flex-col">
          <PitchHalf lineup={home} flipped={false} />
          <div className="flex items-center gap-1.5 px-3 pb-2.5">
            <TeamCrest crest={home.teamLogo} flag={home.teamFlag} name={home.team} size={14} />
            <span className="truncate text-3xs font-semibold text-white/80">{home.team}</span>
            {home.formation && (
              <span className="ml-auto font-mono text-3xs text-white/40">{home.formation}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ lineups }: { lineups: TeamLineup[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {lineups.map((l) => (
        <div key={l.team} className="space-y-3">
          <div className="flex items-center gap-2">
            <TeamCrest crest={l.teamLogo} flag={l.teamFlag} name={l.team} size={20} />
            <span className="truncate font-semibold">{l.team}</span>
            {l.formation && (
              <span className="text-muted-foreground ml-auto font-mono text-xs">
                {l.formation}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {l.startXI.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs">
                  {p.number ?? ""}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.pos && (
                  <span className="text-muted-foreground shrink-0 font-mono text-3xs">
                    {p.pos}
                  </span>
                )}
              </div>
            ))}
          </div>
          {l.substitutes.length > 0 && (
            <p className="text-muted-foreground text-xs">
              <span className="font-medium">Suplentes:</span>{" "}
              {l.substitutes.map((s) => s.name).join(", ")}
            </p>
          )}
          {l.coach && (
            <p className="text-muted-foreground text-xs">
              <span className="font-medium">Entrenador:</span> {l.coach}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function PitchLineup({ lineups }: { lineups: TeamLineup[] }) {
  const hasGrid = lineups.some((l) => l.startXI.some((p) => p.grid !== null));
  const [view, setView] = useState<View>(hasGrid ? "pitch" : "list");

  return (
    <div className={cn("space-y-4", !hasGrid && "mt-0")}>
      {hasGrid && (
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: "pitch", label: "⚽ Campo" },
            { value: "list", label: "Lista" },
          ]}
        />
      )}
      {view === "pitch" && hasGrid ? (
        <PitchView lineups={lineups} />
      ) : (
        <ListView lineups={lineups} />
      )}
    </div>
  );
}
