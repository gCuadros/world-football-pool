import { prisma } from "@/lib/prisma";
import type { FootballProvider, ProviderFixture } from "@/lib/providers/types";
import { getActiveProvider } from "@/lib/providers";
import { openfootballProvider } from "@/lib/providers/openfootball";

export type ImportResult = {
  imported: number;
  created: number;
  finishedUpdated: number;
};

/**
 * Un partido NO puede estar FINISHED (ni LIVE) antes de su kickoff. Si el
 * proveedor lo manda así —glitch puntual de la API, que ha llegado a devolver
 * "FT 0-0" antes de la hora— lo tratamos como UPCOMING. Sin esto, un final
 * fantasma marcaba el partido terminado, puntuaba un 0-0 inexistente y mandaba
 * el "sin puntos" antes de que el balón echara a rodar.
 */
function guardedStatus(
  f: ProviderFixture,
  now: number,
): ProviderFixture["status"] {
  if (f.status !== "UPCOMING" && f.kickoffAt.getTime() > now) return "UPCOMING";
  return f.status;
}

function buildData(f: ProviderFixture, status: ProviderFixture["status"]) {
  const liveMinute = status === "LIVE" ? f.liveMinute : null;
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
    status,
    liveMinute,
    ...(f.advanced !== undefined ? { advanced: f.advanced } : {}),
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

  const now = Date.now();
  // Partidos que revierten de FINISHED a no-finalizado (final fantasma): hay que
  // limpiar los puntos que se les escribieron con el marcador inexistente.
  const reverted: number[] = [];

  for (const f of fixtures) {
    const prevStatus = f.externalId
      ? byExternal.get(f.externalId)
      : byMatchNo.get(f.matchNo);
    const status = guardedStatus(f, now);
    if (prevStatus === undefined) created++;
    if (status === "FINISHED" && prevStatus !== "FINISHED") finishedUpdated++;
    if (prevStatus === "FINISHED" && status !== "FINISHED") reverted.push(f.matchNo);

    const data = buildData(f, status);
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

  if (reverted.length > 0) {
    await prisma.prediction.updateMany({
      where: { match: { matchNo: { in: reverted } } },
      data: { points: null, exact: false },
    });
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
