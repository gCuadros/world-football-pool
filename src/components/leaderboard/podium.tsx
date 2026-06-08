import { Crown } from "lucide-react";

import type { LeaderboardRow } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ORDER = [1, 0, 2]; // 2.º, 1.º, 3.º para el efecto de podio

export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length < 3) return null;

  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {ORDER.map((idx) => {
        const row = top3[idx];
        const isFirst = idx === 0;
        return (
          <div
            key={row.userId}
            className={cn(
              "bg-card flex flex-col items-center rounded-xl border p-4 text-center",
              isFirst ? "border-primary/50" : "border-border",
              isFirst ? "pb-6" : "pb-4",
            )}
          >
            <div className="relative">
              {isFirst ? (
                <Crown className="text-primary absolute -top-5 left-1/2 size-5 -translate-x-1/2" />
              ) : null}
              <Avatar className={cn(isFirst ? "size-14" : "size-11")}>
                <AvatarFallback
                  className={cn(
                    "font-mono font-bold",
                    row.isCurrentUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {row.initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <span
              className={cn(
                "bg-secondary text-primary mt-2 flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold",
              )}
            >
              {row.rank}
            </span>
            <p className="mt-1 truncate text-sm font-semibold">{row.name}</p>
            <p className="text-primary font-mono text-lg font-bold">
              {row.points}
              <span className="text-muted-foreground ml-1 text-3xs font-normal">
                pts
              </span>
            </p>
            <p className="text-muted-foreground font-mono text-3xs">
              {row.accuracy}% precisión
            </p>
          </div>
        );
      })}
    </div>
  );
}
