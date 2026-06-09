import { Crown } from "lucide-react";

import type { LeaderboardRow } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";

const ORDER = [1, 0, 2]; // 2.º, 1.º, 3.º para el efecto de podio

// Tratamiento de medalla por puesto: anillo del avatar + chip del rank.
const MEDAL = [
  { ring: "ring-amber-400", chip: "bg-amber-400 text-amber-950" },
  { ring: "ring-slate-300 dark:ring-slate-400", chip: "bg-slate-300 text-slate-800" },
  { ring: "ring-orange-400", chip: "bg-orange-400 text-orange-950" },
];

export function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length < 3) return null;

  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {ORDER.map((idx) => {
        const row = top3[idx];
        const isFirst = idx === 0;
        const medal = MEDAL[idx];
        return (
          <div
            key={row.userId}
            className={cn(
              "flex flex-col items-center rounded-2xl border p-4 text-center",
              // El líder sube al panel "estadio de noche" con texto claro.
              isFirst
                ? "bg-aurora inset-hairline glow-primary border-transparent pt-6 pb-7 text-white"
                : "bg-card border-border pb-4",
            )}
          >
            <div className="relative">
              {isFirst ? (
                <Crown className="absolute -top-5 left-1/2 size-5 -translate-x-1/2 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              ) : null}
              <Avatar
                className={cn(
                  "ring-2 ring-offset-2",
                  isFirst
                    ? "ring-offset-transparent size-14"
                    : "ring-offset-card size-11",
                  medal.ring,
                )}
              >
                <AvatarImage src={row.avatar?.startsWith("data:") ? row.avatar : "/avatar-default.webp"} />
              </Avatar>
            </div>
            <span
              className={cn(
                "mt-2.5 flex size-6 items-center justify-center rounded-full font-mono text-xs font-bold shadow-sm",
                medal.chip,
              )}
            >
              {row.rank}
            </span>
            <p className="mt-1 w-full truncate text-sm font-semibold">{row.name}</p>
            <p
              className={cn(
                "font-mono text-lg font-bold",
                isFirst ? "text-amber-300" : "text-primary",
              )}
            >
              <CountUp value={row.points} />
              <span
                className={cn(
                  "ml-1 text-3xs font-normal",
                  isFirst ? "text-white/60" : "text-muted-foreground",
                )}
              >
                pts
              </span>
            </p>
            <p
              className={cn(
                "font-mono text-3xs",
                isFirst ? "text-white/60" : "text-muted-foreground",
              )}
            >
              {row.accuracy}% precisión
            </p>
          </div>
        );
      })}
    </div>
  );
}
