import { Users } from "lucide-react";

import { getMatchLineups } from "@/lib/queries";
import type { LineupPlayer } from "@/lib/providers/api-football";

// Orden y etiquetas de las líneas del once (pos de API-Football: G/D/M/F).
const LINES: { pos: string; label: string }[] = [
  { pos: "G", label: "Portero" },
  { pos: "D", label: "Defensa" },
  { pos: "M", label: "Centro del campo" },
  { pos: "F", label: "Ataque" },
];

/**
 * Último once inicial del equipo (alineación de su último partido con datos),
 * agrupado por líneas, con formación y seleccionador. Devuelve null si la API
 * no tiene alineación para ese partido.
 */
export async function LastLineup({
  externalId,
  teamName,
}: {
  externalId: string;
  teamName: string;
}) {
  const lineups = await getMatchLineups(externalId);
  const mine = lineups.find((l) => l.team === teamName);
  if (!mine || mine.startXI.length === 0) return null;

  const byLine = new Map<string, LineupPlayer[]>();
  for (const p of mine.startXI) {
    const key = p.pos ?? "M";
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key)!.push(p);
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Users className="text-primary size-4" />
        Último once
        {mine.formation && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-2xs font-bold">
            {mine.formation}
          </span>
        )}
      </h2>

      <div className="card-glass rounded-2xl p-4">
        <div className="space-y-3">
          {LINES.map(({ pos, label }) => {
            const players = byLine.get(pos);
            if (!players?.length) return null;
            return (
              <div key={pos}>
                <p className="text-muted-foreground mb-1.5 font-mono text-3xs tracking-wide uppercase">
                  {label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {players.map((p) => (
                    <span
                      key={`${p.number}-${p.name}`}
                      className="bg-muted/50 ring-border/50 flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-medium ring-1"
                    >
                      <span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full font-mono text-3xs font-bold">
                        {p.number ?? "–"}
                      </span>
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {mine.coach && (
          <p className="text-muted-foreground border-border/60 mt-4 border-t pt-3 text-xs">
            <span className="font-mono text-3xs tracking-wide uppercase">DT</span>{" "}
            <span className="text-foreground font-semibold">{mine.coach}</span>
          </p>
        )}
      </div>
    </section>
  );
}
