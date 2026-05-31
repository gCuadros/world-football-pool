import { redirect } from "next/navigation";
import { Target, Crosshair, Check, Flame } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getUserStatsDetailed } from "@/lib/stats";
import { STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estadísticas" };

export default async function EstadisticasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let stats;
  try {
    stats = await getUserStatsDetailed(user.id);
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          No se pudieron cargar tus estadísticas. Revisa Supabase en{" "}
          <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  if (stats.predictionsCount === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
        Aún no tienes predicciones puntuadas. Cuando terminen los partidos verás
        aquí tu rendimiento.
      </div>
    );
  }

  const kpis = [
    { label: "Puntos", value: stats.totalPoints, icon: Target },
    { label: "Precisión", value: `${stats.accuracy}%`, icon: Check },
    { label: "Exactos", value: stats.exact, icon: Crosshair },
    { label: "Mejor racha", value: stats.bestStreak, icon: Flame },
  ];

  const dist = [
    { label: "Exacto (+3)", value: stats.exact, tone: "bg-success" },
    { label: "Resultado (+1)", value: stats.correct, tone: "bg-primary" },
    { label: "Fallo (0)", value: stats.missed, tone: "bg-muted-foreground/40" },
  ];
  const distMax = Math.max(1, stats.exact, stats.correct, stats.missed);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border-border bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
                {label}
              </span>
              <Icon className="text-primary size-4" />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Precisión por fase */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <h2 className="mb-4 border-primary border-l-2 pl-3 text-base font-bold">
            Precisión por fase
          </h2>
          <div className="space-y-3">
            {stats.byStage.map((s) => (
              <div key={s.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{STAGE_LABELS[s.stage]}</span>
                  <span className="text-muted-foreground font-mono">
                    {s.hits}/{s.total} · {s.accuracy}%
                  </span>
                </div>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${s.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de aciertos */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <h2 className="mb-4 border-primary border-l-2 pl-3 text-base font-bold">
            Distribución de resultados
          </h2>
          <div className="flex h-44 items-end justify-around gap-4">
            {dist.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-lg font-bold">{d.value}</span>
                <div
                  className={cn("w-full rounded-t-lg", d.tone)}
                  style={{ height: `${(d.value / distMax) * 100}%`, minHeight: 4 }}
                />
                <span className="text-muted-foreground text-center font-mono text-[10px]">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mejores predicciones */}
      {stats.best.length > 0 ? (
        <div className="border-border bg-card rounded-2xl border p-5">
          <h2 className="mb-4 border-success border-l-2 pl-3 text-base font-bold">
            Tus marcadores exactos
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.best.map((b) => (
              <div
                key={b.matchId}
                className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-2.5 text-sm"
              >
                <span className="text-base">{b.homeFlag ?? "🏳️"}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {b.homeTeam} {b.score} {b.awayTeam}
                </span>
                <span className="text-base">{b.awayFlag ?? "🏳️"}</span>
                <span className="text-success font-mono text-xs font-bold">+3</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
