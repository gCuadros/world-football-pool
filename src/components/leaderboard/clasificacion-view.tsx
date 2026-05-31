"use client";

import { useState } from "react";

import type { LeaderboardRow, MiniLeagueVM } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Podium } from "@/components/leaderboard/podium";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export function ClasificacionView({
  generalRows,
  miniLeagues,
}: {
  generalRows: LeaderboardRow[];
  miniLeagues: MiniLeagueVM[];
}) {
  // tab = "general" o el id de una mini-liga.
  const [tab, setTab] = useState<string>("general");

  const tabs = [
    { id: "general", label: "General" },
    ...miniLeagues.map((l) => ({ id: l.id, label: l.name })),
  ];

  const activeRows =
    tab === "general"
      ? generalRows
      : (miniLeagues.find((l) => l.id === tab)?.rows ?? []);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
        <Badge
          variant="outline"
          className="border-live/40 text-live ml-auto gap-1.5 font-mono"
        >
          <span className="bg-live size-1.5 rounded-full" />
          EN VIVO
        </Badge>
      </div>

      <Podium rows={activeRows} />
      <LeaderboardTable rows={activeRows} />
    </div>
  );
}
