import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Lock, Check } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getUnlockedAchievements } from "@/lib/leaderboard";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import Loading from "./loading";

export const metadata = { title: "Logros" };

export default function LogrosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LogrosContent />
    </Suspense>
  );
}

async function LogrosContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let unlocked: Set<string>;
  try {
    unlocked = (await getUnlockedAchievements(user.id)) as Set<string>;
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          No se pudieron cargar tus logros. Revisa Supabase en{" "}
          <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  const count = unlocked.size;
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((count / total) * 100);

  return (
    <div className="space-y-6">
      {/* Progreso */}
      <div className="border-border bg-card rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Tus logros</h2>
            <p className="text-muted-foreground text-sm">
              Has desbloqueado {count} de {total} logros.
            </p>
          </div>
          <span className="text-primary font-mono text-3xl font-bold">{pct}%</span>
        </div>
        <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cuadrícula */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const Icon = a.icon;
          const has = unlocked.has(a.type);
          return (
            <div
              key={a.type}
              className={cn(
                "relative flex items-start gap-3 rounded-2xl border p-4",
                has
                  ? "border-primary/30 bg-card"
                  : "border-border bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  has
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground/40",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "font-semibold",
                      !has && "text-muted-foreground",
                    )}
                  >
                    {a.label}
                  </h3>
                  {has ? (
                    <Check className="text-success size-4" />
                  ) : (
                    <Lock className="text-muted-foreground/50 size-3.5" />
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {a.description}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-block font-mono text-[10px] tracking-wide uppercase",
                    has ? "text-success" : "text-muted-foreground/60",
                  )}
                >
                  {has ? "Desbloqueado" : "Bloqueado"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
