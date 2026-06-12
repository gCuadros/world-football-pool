import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Check, Trophy, Flame, Target, Zap, BarChart2 } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getAchievementsByLeague, getUserGlobalStats } from "@/lib/leaderboard";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import Loading from "./loading";

export const metadata = { title: "Logros" };

export default function LogrosPage() {
  return (
    <Reveal fallback={<Loading />}>
      <LogrosContent />
    </Reveal>
  );
}

async function LogrosContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [leagueAchievements, stats] = await Promise.all([
    getAchievementsByLeague(user.id),
    getUserGlobalStats(user.id),
  ]);
  const total = ACHIEVEMENTS.length;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Logros</h1>

      {/* Hero de estadísticas globales */}
      {stats.predictionsCount > 0 && (
        <section className="bg-card border-border/60 rounded-2xl border shadow-sm overflow-hidden">
          <div className="from-primary/10 to-card bg-gradient-to-r px-5 py-4">
            <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase mb-3">
              Mis estadísticas globales
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <StatChip icon={Target} label="Puntos" value={stats.totalPoints} />
              <StatChip icon={BarChart2} label="Precisión" value={`${stats.accuracy}%`} />
              <StatChip icon={Zap} label="Exactos" value={stats.exactCount} />
              <StatChip icon={Trophy} label="Pred." value={stats.predictionsCount} />
              <StatChip
                icon={Flame}
                label="Racha actual"
                value={stats.currentStreak}
                highlight={stats.currentStreak >= 3}
              />
              <StatChip
                icon={Flame}
                label="Mejor racha"
                value={stats.bestStreak}
                highlight={stats.bestStreak >= 5}
              />
            </div>
          </div>
        </section>
      )}

      {leagueAchievements.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
          <Trophy className="mx-auto mb-3 size-8 opacity-40" />
          <p className="font-medium">Aún no tienes logros</p>
          <p className="mt-1">Únete a una liga y empieza a predecir para desbloquearlos.</p>
          <Link href="/ligas" className="text-primary mt-4 inline-block text-sm font-medium hover:underline">
            Ir a mis ligas →
          </Link>
        </div>
      ) : (
        leagueAchievements.map(({ leagueId, leagueName, unlocked }) => {
        const count = unlocked.size;
        const pct = Math.round((count / total) * 100);

        return (
          <section key={leagueId} className="space-y-4">
            {/* Cabecera de liga */}
            <div className="card-glass rounded-2xl p-5">
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
                          "mt-2 inline-block font-mono text-3xs tracking-wide uppercase",
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
      })
      )}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <Icon
        className={cn("size-4 mb-0.5", highlight ? "text-warning" : "text-primary")}
      />
      <span className={cn("font-mono text-lg font-bold", highlight && "text-warning")}>
        {value}
      </span>
      <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
