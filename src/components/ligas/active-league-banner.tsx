import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PitchLines } from "@/components/ui/pitch-lines";

export type ActiveLeague = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  rank: number | null;
  points: number;
};

// Banner de la liga activa (diseño: pantalla 08, "ActiveBanner").
export function ActiveLeagueBanner({ league }: { league: ActiveLeague }) {
  const meta = [
    `Código: ${league.inviteCode}`,
    `${league.memberCount} ${league.memberCount === 1 ? "miembro" : "miembros"}`,
    league.rank ? `Tu posición: ${league.rank}.º` : "Sin posición",
    `${league.points} pts`,
  ].join("  ·  ");

  return (
    <div className="bg-aurora inset-hairline glow-primary relative flex flex-col gap-4 overflow-hidden rounded-3xl p-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <PitchLines />
      <div className="relative min-w-0 flex-1 space-y-1.5">
        <p className="font-mono text-3xs font-bold tracking-[0.15em] text-white/60">
          LIGA ACTIVA
        </p>
        <h2 className="truncate font-mono text-xl font-bold text-white sm:text-2xl">
          {league.name}
        </h2>
        <p className="truncate text-sm text-white/70">{meta}</p>
      </div>
      <Link
        href={`/liga/${league.id}/predicciones`}
        className="text-primary relative flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold transition-colors hover:bg-white/90"
      >
        Ir a predicciones
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
