import { prisma } from "@/lib/prisma";
import type { FootballProvider, ProviderFixture } from "@/lib/providers/types";
import { getActiveProvider } from "@/lib/providers";
import { openfootballProvider } from "@/lib/providers/openfootball";

export type ImportResult = {
  imported: number;
  created: number;
  finishedUpdated: number;
};

function buildData(f: ProviderFixture) {
  const liveMinute = f.status === "LIVE" ? f.liveMinute : null;
  return {
    matchNo: f.matchNo,
    externalId: f.externalId,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    homeFlag: f.homeFlag,
    awayFlag: f.awayFlag,
    homeCrest: f.homeCrest,
    awayCrest: f.awayCrest,
    kickoffAt: f.kickoffAt,
    stage: f.stage,
    group: f.group,
    stadium: f.stadium,
    city: f.city,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    status: f.status,
    liveMinute,
  };
}

/**
 * Importa/actualiza el calendario desde un proveedor.
 * - Upsert por `externalId` (id estable del proveedor) si está; si no, por `matchNo`.
 * - Crea los partidos que falten y actualiza metadatos (equipos, escudos, fecha,
 *   sede, grupo) + marcador/estado/minuto.
 */
export async function importFixtures(
  provider: FootballProvider,
): Promise<ImportResult> {
  const fixtures = await provider.getFixtures();
  let created = 0;
  let finishedUpdated = 0;

  const existing = await prisma.match.findMany({
    select: { matchNo: true, externalId: true, status: true },
  });
  const byExternal = new Map<string, string>();
  const byMatchNo = new Map<number, string>();
  for (const m of existing) {
    if (m.externalId) byExternal.set(m.externalId, m.status);
    byMatchNo.set(m.matchNo, m.status);
  }

  for (const f of fixtures) {
    const prevStatus = f.externalId
      ? byExternal.get(f.externalId)
      : byMatchNo.get(f.matchNo);
    if (prevStatus === undefined) created++;
    if (f.status === "FINISHED" && prevStatus !== "FINISHED") finishedUpdated++;

    const data = buildData(f);
    if (f.externalId) {
      await prisma.match.upsert({
        where: { externalId: f.externalId },
        create: data,
        update: data,
      });
    } else {
      await prisma.match.upsert({
        where: { matchNo: f.matchNo },
        create: data,
        update: data,
      });
    }
  }

  return { imported: fixtures.length, created, finishedUpdated };
}

/**
 * Importa desde el proveedor activo (API-Football si hay clave; si no,
 * openfootball). Si el proveedor activo falla (p. ej. plan Free sin acceso a la
 * temporada 2026), cae automáticamente a openfootball para no romper la app.
 */
export async function importFromActiveProvider(): Promise<
  ImportResult & { provider: string }
> {
  const primary = getActiveProvider();
  try {
    const result = await importFixtures(primary);
    return { ...result, provider: primary.name };
  } catch (e) {
    if (primary.name === "openfootball") throw e;
    console.warn(
      `[fixtures] "${primary.name}" falló (${(e as Error).message}); usando openfootball.`,
    );
    const result = await importFixtures(openfootballProvider);
    return { ...result, provider: "openfootball (fallback)" };
  }
}
