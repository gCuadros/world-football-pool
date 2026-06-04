import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Check, Trophy } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getAchievementsByLeague } from "@/lib/leaderboard";
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

  const leagueAchievements = await getAchievementsByLeague(user.id);
  const total = ACHIEVEMENTS.length;

  if (leagueAchievements.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Logros</h1>
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          <Trophy className="mx-auto mb-3 size-8 opacity-40" />
          <p className="font-medium">Aún no tienes logros</p>
          <p className="mt-1">Únete a una liga y empieza a predecir para desbloquearlos.</p>
          <Link href="/ligas" className="text-primary mt-4 inline-block text-sm font-medium hover:underline">
            Ir a mis ligas →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Logros</h1>

      {leagueAchievements.map(({ leagueId, leagueName, unlocked }) => {
        const count = unlocked.size;
        const pct = Math.round((count / total) * 100);

        return (
          <section key={leagueId} className="space-y-4">
            {/* Cabecera de liga */}
            <div className="border-border bg-card rounded-2xl border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/liga/${leagueId}`}
                    className="hover:text-primary text-base font-bold transition-colors"
                  >
                    {leagueName}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {count} de {total} logros desbloqueados
                  </p>
                </div>
                <span className="text-primary font-mono text-2xl font-bold">{pct}%</span>
              </div>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Cuadrícula de logros */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ACHIEVEMENTS.map((a) => {
                const Icon = a.icon;
                const has = unlocked.has(a.type);
                return (
                  <div
                    key={a.type}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4",
                      has ? "border-primary/30 bg-card" : "border-border bg-muted/30",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        has ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={cn("font-semibold", !has && "text-muted-foreground")}>
                          {a.label}
                        </h3>
                        {has ? (
                          <Check className="text-success size-4" />
                        ) : (
                          <Lock className="text-muted-foreground/50 size-3.5" />
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">{a.description}</p>
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
          </section>
        );
      })}
    </div>
  );
}
