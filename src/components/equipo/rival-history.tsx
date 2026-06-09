import { Swords } from "lucide-react";

import { getMatchPrediction, getMatchH2H } from "@/lib/queries";
import { cn } from "@/lib/utils";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/**
 * Bloque "ante el próximo rival": pronóstico de la API (porcentajes 1X2 +
 * consejo) e historial de los últimos cruces, todo desde la perspectiva del
 * equipo de la página. Devuelve null sin datos (sin API key o sin cobertura).
 */
export async function RivalHistory({
  externalId,
  teamName,
  rivalName,
}: {
  externalId: string;
  teamName: string;
  rivalName: string;
}) {
  const prediction = await getMatchPrediction(externalId);
  const h2h = prediction
    ? await getMatchH2H(prediction.homeId, prediction.awayId)
    : [];

  if (!prediction && h2h.length === 0) return null;

  // Resultado de cada cruce desde la perspectiva del equipo de la página.
  const record = { W: 0, D: 0, L: 0 };
  const rows = h2h
    .filter(
      (m) =>
        m.homeScore !== null &&
        m.awayScore !== null &&
        // Solo cruces donde reconocemos al equipo (los nombres de la API se
        // traducen; si no casan, mejor no computar un resultado engañoso).
        (m.home === teamName || m.away === teamName),
    )
    .map((m) => {
      const isHome = m.home === teamName;
      const my = isHome ? m.homeScore! : m.awayScore!;
      const opp = isHome ? m.awayScore! : m.homeScore!;
      const result: "W" | "D" | "L" = my > opp ? "W" : my < opp ? "L" : "D";
      record[result]++;
      return { ...m, result };
    });

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Swords className="text-primary size-4" />
        Ante {rivalName}
      </h2>

      <div className="bg-card border-border/60 space-y-4 rounded-2xl border p-4 shadow-sm">
        {/* Pronóstico de la API para el próximo cruce */}
        {prediction && (
          <div className="space-y-2">
            <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
              Pronóstico del partido
            </p>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full">
              <div className="bg-primary" style={{ width: `${prediction.percent.home}%` }} />
              <div className="bg-muted-foreground/30" style={{ width: `${prediction.percent.draw}%` }} />
              <div className="bg-live/70" style={{ width: `${prediction.percent.away}%` }} />
            </div>
            <div className="text-muted-foreground flex justify-between font-mono text-3xs">
              <span>Local {prediction.percent.home}%</span>
              <span>Empate {prediction.percent.draw}%</span>
              <span>Visitante {prediction.percent.away}%</span>
            </div>
            {prediction.winnerName && (
              <p className="text-xs">
                <span className="text-muted-foreground">Favorito:</span>{" "}
                <span className="font-semibold">{prediction.winnerName}</span>
              </p>
            )}
          </div>
        )}

        {/* Historial de cruces */}
        {rows.length > 0 && (
          <div className={cn("space-y-2", prediction && "border-border/60 border-t pt-4")}>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
                Últimos cruces
              </p>
              <div className="flex gap-1 font-mono text-3xs font-bold">
                <span className="bg-success/15 text-success rounded px-1.5 py-0.5">{record.W}G</span>
                <span className="bg-warning/15 text-warning rounded px-1.5 py-0.5">{record.D}E</span>
                <span className="bg-live/15 text-live rounded px-1.5 py-0.5">{record.L}P</span>
              </div>
            </div>
            {rows.map((m) => (
              <div
                key={`${m.date}-${m.home}`}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded font-mono text-2xs font-bold",
                    m.result === "W" && "bg-success/15 text-success",
                    m.result === "D" && "bg-warning/15 text-warning",
                    m.result === "L" && "bg-live/15 text-live",
                  )}
                >
                  {m.result === "W" ? "G" : m.result === "L" ? "P" : "E"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {m.homeFlag} {m.home}{" "}
                  <span className="font-mono font-bold tabular-nums">
                    {m.homeScore}-{m.awayScore}
                  </span>{" "}
                  {m.away} {m.awayFlag}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono text-2xs capitalize">
                  {DATE_FMT.format(new Date(m.date))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
