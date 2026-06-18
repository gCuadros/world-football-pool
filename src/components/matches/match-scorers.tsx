import { getMatchEvents } from "@/lib/queries";
import { PlayerLink } from "@/components/matches/player-link";

/**
 * Autores de los goles de un partido, derivados de la cronología (eventos) ya
 * cacheada. Cada nombre enlaza a su ficha. Devuelve null si no hay goles o la
 * API no cubre el partido. Pensado para colgar de una tarjeta de resultado.
 */
export async function MatchScorers({ externalId }: { externalId: string | null }) {
  if (!externalId) return null;
  const events = await getMatchEvents(externalId);
  const goals = events.filter(
    (e) =>
      e.type.toLowerCase() === "goal" &&
      !e.detail.toLowerCase().includes("missed"),
  );
  if (goals.length === 0) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
      {goals.map((g, i) => {
        const own = g.detail.toLowerCase().includes("own");
        const label = (
          <>
            <span aria-hidden="true">⚽</span>
            <span className="truncate">
              {g.player ?? "Gol"}
              {own && " (p.p.)"}
            </span>
            {g.minute != null && <span className="font-mono">{g.minute}&apos;</span>}
          </>
        );
        return g.playerId && g.player ? (
          <PlayerLink key={i} playerId={g.playerId} className="flex items-center gap-1 hover:underline">
            {label}
          </PlayerLink>
        ) : (
          <span key={i} className="flex items-center gap-1">
            {label}
          </span>
        );
      })}
    </div>
  );
}
