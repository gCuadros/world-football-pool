import { prisma } from "@/lib/prisma";
import type { FootballProvider } from "@/lib/providers/types";

export type ImportResult = {
  imported: number;
  created: number;
  finishedUpdated: number;
};

/**
 * Importa/actualiza el calendario desde un proveedor (upsert por matchNo).
 * - Crea los partidos que falten.
 * - Actualiza metadatos (equipos, fecha, sede) sin pisar un resultado ya
 *   guardado, salvo que el proveedor traiga un marcador nuevo (FINISHED).
 * Devuelve cuántos se importaron y cuántos resultados nuevos se aplicaron.
 */
export async function importFixtures(
  provider: FootballProvider,
): Promise<ImportResult> {
  const fixtures = await provider.getFixtures();
  let created = 0;
  let finishedUpdated = 0;

  const existing = await prisma.match.findMany({
    select: { matchNo: true, status: true },
  });
  const existingMap = new Map(existing.map((m) => [m.matchNo, m.status]));

  for (const f of fixtures) {
    const prevStatus = existingMap.get(f.matchNo);
    const providerHasResult =
      f.status === "FINISHED" && f.homeScore !== null && f.awayScore !== null;

    if (prevStatus === undefined) created++;
    if (providerHasResult && prevStatus !== "FINISHED") finishedUpdated++;

    await prisma.match.upsert({
      where: { matchNo: f.matchNo },
      create: {
        matchNo: f.matchNo,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        homeFlag: f.homeFlag,
        awayFlag: f.awayFlag,
        kickoffAt: f.kickoffAt,
        stage: f.stage,
        group: f.group,
        stadium: f.stadium,
        city: f.city,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        status: f.status,
      },
      update: {
        // Metadatos del fixture (pueden corregirse en el origen).
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        homeFlag: f.homeFlag,
        awayFlag: f.awayFlag,
        kickoffAt: f.kickoffAt,
        stage: f.stage,
        group: f.group,
        stadium: f.stadium,
        city: f.city,
        // Solo aplica resultado si el proveedor lo trae (no borra los existentes).
        ...(providerHasResult
          ? {
              homeScore: f.homeScore,
              awayScore: f.awayScore,
              status: "FINISHED" as const,
            }
          : {}),
      },
    });
  }

  return { imported: fixtures.length, created, finishedUpdated };
}
