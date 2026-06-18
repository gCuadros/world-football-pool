import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

import { getSquad } from "@/lib/queries";
import type { SquadPlayer } from "@/lib/providers/api-football";

// Orden de líneas (la posición ya viene en español desde el provider).
const LINES = ["Portero", "Defensa", "Centrocampista", "Delantero"];

/**
 * Plantilla convocada de la selección para el Mundial, agrupada por posición.
 * Cada jugador enlaza a su ficha. Devuelve null si la API no tiene plantilla.
 */
export async function TeamSquad({ teamId }: { teamId: number }) {
  const squad = await getSquad(teamId);
  if (squad.length === 0) return null;

  const byLine = new Map<string, SquadPlayer[]>();
  for (const p of squad) {
    const key = p.position ?? "Otros";
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key)!.push(p);
  }
  // Líneas conocidas primero, luego cualquier resto (p. ej. "Otros").
  const order = [...LINES, ...[...byLine.keys()].filter((k) => !LINES.includes(k))];
  for (const list of byLine.values()) {
    list.sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Users className="text-primary size-4" />
        Plantilla
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-2xs font-bold">
          {squad.length}
        </span>
      </h2>

      <div className="card-glass space-y-4 rounded-2xl p-4">
        {order.map((line) => {
          const players = byLine.get(line);
          if (!players?.length) return null;
          return (
            <div key={line}>
              <p className="text-muted-foreground mb-2 font-mono text-3xs tracking-wide uppercase">
                {line}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {players.map((p) => (
                  <Link
                    key={p.id}
                    href={`/jugador/${p.id}`}
                    className="bg-muted/40 hover:bg-muted/70 flex items-center gap-2 rounded-xl py-1.5 pr-2.5 pl-1.5 transition-colors"
                  >
                    {p.photo ? (
                      <Image
                        src={p.photo}
                        alt={p.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="size-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-3xs">
                        {p.number ?? "–"}
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{p.name}</span>
                      {p.number != null && (
                        <span className="text-muted-foreground block font-mono text-3xs">
                          #{p.number}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
