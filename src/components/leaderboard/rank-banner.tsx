import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { CountUp } from "@/components/ui/count-up";
import { PitchLines } from "@/components/ui/pitch-lines";

type RankInfo = { rank: number | null; totalPlayers: number; points: number; accuracy: number; predictionsCount: number; exactCount: number; currentStreak: number; bestStreak: number; trend: number; percentile: number | null };

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
    { label: "Precisión", value: info.accuracy, suffix: "%" },
    { label: "Predicciones", value: info.predictionsCount },
  ];

  return (
    <div className="bg-aurora inset-hairline glow-primary relative overflow-hidden rounded-3xl p-5 text-white sm:p-6">
      <PitchLines />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center">
        <div>
          <p className="font-mono text-2xs tracking-widest text-white/60 uppercase">
            Tu posición
          </p>
          <div className="flex items-end gap-3">
            <span className="text-gradient-hero font-mono text-6xl leading-none font-black tracking-tight sm:text-7xl">
              {info.rank ? `#${info.rank}` : "—"}
            </span>
            <span
              className={
                "mb-1.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 " +
                (trendUp
                  ? "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25"
                  : trendDown
                    ? "bg-rose-400/15 text-rose-300 ring-rose-300/25"
                    : "bg-white/10 text-white/80 ring-white/15")
              }
            >
              <TrendIcon className="size-3.5" />
              {trendLabel}
            </span>
          </div>
          {info.percentile ? (
            <p className="mt-2 text-sm text-white/70">
              Estás en el top {info.percentile}% de {info.totalPlayers}{" "}
              participantes
            </p>
          ) : null}
        </div>

        <div className="flex w-full items-stretch justify-between gap-4 sm:ml-auto sm:w-auto sm:justify-normal sm:gap-0 sm:divide-x sm:divide-white/10">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className="font-mono text-xl font-bold sm:text-2xl">
                <CountUp value={s.value} />
                {s.suffix}
              </p>
              <p className="font-mono text-3xs tracking-wide text-white/60 uppercase">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
