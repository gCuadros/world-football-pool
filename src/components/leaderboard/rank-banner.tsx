import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import type { RankInfo } from "@/lib/leaderboard";

export function RankBanner({ info }: { info: RankInfo }) {
  const trendUp = info.trend > 0;
  const trendDown = info.trend < 0;
  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;
  const trendLabel = trendUp
    ? `+${info.trend} esta semana`
    : trendDown
      ? `${info.trend} esta semana`
      : "Sin cambios";

  const stats = [
    { label: "Puntos", value: info.points },
    { label: "Precisión", value: `${info.accuracy}%` },
    { label: "Predicciones", value: info.predictionsCount },
  ];

  return (
    <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl p-6 shadow-lg">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(120% 120% at 100% 0%, #0a4f8a 0%, transparent 55%), radial-gradient(100% 100% at 0% 100%, #004a87 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-wrap items-center gap-6">
        <div>
          <p className="text-primary-foreground/60 font-mono text-[11px] tracking-widest uppercase">
            Tu posición
          </p>
          <div className="flex items-end gap-3">
            <span className="font-mono text-6xl leading-none font-bold">
              {info.rank ? `#${info.rank}` : "—"}
            </span>
            <span
              className="bg-primary-foreground/10 mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            >
              <TrendIcon className="size-3.5" />
              {trendLabel}
            </span>
          </div>
          {info.percentile ? (
            <p className="text-primary-foreground/70 mt-2 text-sm">
              Estás en el top {info.percentile}% de {info.totalPlayers}{" "}
              participantes
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono text-2xl font-bold">{s.value}</p>
              <p className="text-primary-foreground/60 font-mono text-[10px] tracking-wide uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
