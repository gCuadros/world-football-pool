import { BackButton } from "@/components/ui/back-button";
import { getTournamentPhysical } from "@/lib/providers/fifa-physical";
import { PhysicalLeaderboards } from "@/components/fisico/physical-leaderboards";

export const metadata = {
  title: "Rendimiento físico · Mundial 2026",
};

export default function FisicoPage() {
  const players = getTournamentPhysical();
  const teams = [...new Set(players.map((p) => p.team).filter((t): t is string => !!t))].sort();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton fallback="/mundial" />

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          <span aria-hidden="true">🏃</span> Rendimiento físico
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Acumulado del Mundial: distancia, velocidad punta y sprints por jugador.
        </p>
      </header>

      {players.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Aún no hay datos físicos. Aparecerán según se jueguen los partidos.
        </div>
      ) : (
        <PhysicalLeaderboards players={players} teams={teams} />
      )}

      <p className="text-muted-foreground text-2xs">
        Velocidad punta en km/h · datos físicos oficiales FIFA (instantánea)
      </p>
    </div>
  );
}
