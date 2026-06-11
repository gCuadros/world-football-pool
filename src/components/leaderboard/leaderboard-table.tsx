"use client";

import { useState } from "react";
import Link from "next/link";
import { Fire, CaretLeft, CaretRight } from "@phosphor-icons/react";

import type { LeaderboardRow } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

const PAGE_SIZE = 10;

// Chips de medalla para el top 3 (mismo tratamiento que el podio).
const MEDAL_CHIP = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
];

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      {/* Cabecera */}
      <div className="text-muted-foreground border-border bg-muted/40 grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center gap-2 border-b px-3 py-2.5 font-mono text-3xs tracking-wide uppercase sm:grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem] sm:px-4">
        <span>Pos</span>
        <span>Jugador</span>
        <span className="text-right">Pts</span>
        <span className="hidden text-right sm:block">Prec</span>
        <span className="hidden text-right sm:block">Pred</span>
        <span className="text-right">Racha</span>
      </div>

      {/* Filas */}
      <div className="divide-border divide-y">
        {pageRows.map((row) => (
          <div
            key={row.userId}
            className={cn(
              "grid grid-cols-[2rem_1fr_2.5rem_2.5rem] items-center gap-2 px-3 py-2.5 text-sm sm:grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem] sm:px-4",
              row.isCurrentUser &&
                "bg-primary/5 border-l-2 border-l-primary pl-[calc(0.75rem-2px)] sm:pl-[calc(1rem-2px)]",
            )}
          >
            {row.rank <= 3 ? (
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold shadow-sm",
                  MEDAL_CHIP[row.rank - 1],
                )}
              >
                {row.rank}
              </span>
            ) : (
              <span className="text-muted-foreground pl-2 font-mono font-bold">
                {row.rank}
              </span>
            )}
            <Link
              href={`/perfil/${row.userId}`}
              className="flex min-w-0 items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={row.avatar?.startsWith("data:") ? row.avatar : "/avatar-default.webp"} />
              </Avatar>
              <span className="truncate font-medium">
                {row.name}
                {row.isCurrentUser ? (
                  <span className="text-primary ml-1.5 font-mono text-3xs">
                    (tú)
                  </span>
                ) : null}
              </span>
            </Link>
            <span className="flex items-center justify-end gap-1 text-right font-mono font-bold">
              {row.points}
              {/* Puntos provisionales en juego: la clasificación se mueve gol a gol. */}
              {row.livePoints > 0 && (
                <span className="bg-live/15 text-live rounded-full px-1.5 py-0.5 text-3xs font-bold">
                  +{row.livePoints}
                </span>
              )}
            </span>
            <span className="text-muted-foreground hidden text-right font-mono text-xs sm:block">
              {row.accuracy}%
            </span>
            <span className="text-muted-foreground hidden text-right font-mono text-xs sm:block">
              {row.predictionsCount}
            </span>
            <span className="flex items-center justify-end gap-0.5 text-right font-mono text-xs">
              {row.currentStreak > 0 ? (
                <>
                  <Fire className="text-warning size-3.5" />
                  {row.currentStreak}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {pageCount > 1 ? (
        <div className="border-border flex items-center justify-between border-t px-4 py-2.5">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-40"
          >
            <CaretLeft className="size-4" /> Anterior
          </button>
          <span className="text-muted-foreground font-mono text-xs">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs disabled:opacity-40"
          >
            Siguiente <CaretRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
