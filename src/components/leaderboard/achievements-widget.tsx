import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AchievementType } from "@prisma/client";

import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export function AchievementsWidget({
  unlocked,
}: {
  unlocked: AchievementType[];
}) {
  const set = new Set(unlocked);

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Logros</h3>
        <span className="text-muted-foreground font-mono text-xs">
          {set.size}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const Icon = a.icon;
          const has = set.has(a.type);
          return (
            <div
              key={a.type}
              title={`${a.label} — ${a.description}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-xl border",
                has
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground/40",
              )}
            >
              <Icon className="size-5" />
            </div>
          );
        })}
      </div>
      <Link
        href="/logros"
        className="text-primary mt-3 flex items-center gap-1 text-xs font-medium hover:underline"
      >
        Ver todos los logros
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
