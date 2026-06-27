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

// Campos comunes (sin matchNo): se usan tal cual en UPDATE. El matchNo se añade
// solo en CREATE, porque es la clave estable que NO debe cambiar al actualizar.
function buildData(f: ProviderFixture, status: ProviderFixture["status"]) {
  const liveMinute = status === "LIVE" ? f.liveMinute : null;
  return {
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
  type Prev = { matchNo: number; status: string };
  const byExternal = new Map<string, Prev>();
  const byMatchNo = new Map<number, Prev>();
  const usedMatchNos = new Set<number>();
  for (const m of existing) {
    usedMatchNos.add(m.matchNo);
    const prev = { matchNo: m.matchNo, status: m.status };
    if (m.externalId) byExternal.set(m.externalId, prev);
    byMatchNo.set(m.matchNo, prev);
  }

  const now = Date.now();
  // Partidos que revierten de FINISHED a no-finalizado (final fantasma): hay que
  // limpiar los puntos que se les escribieron con el marcador inexistente.
  const reverted: number[] = [];

  for (const f of fixtures) {
    const prev = f.externalId
      ? byExternal.get(f.externalId)
      : byMatchNo.get(f.matchNo);
    const status = guardedStatus(f, now);
    if (prev === undefined) created++;
    if (status === "FINISHED" && prev?.status !== "FINISHED") finishedUpdated++;
    if (prev?.status === "FINISHED" && status !== "FINISHED") reverted.push(prev.matchNo);

    // matchNo ESTABLE: una vez asignado, un partido conserva su número. El del
    // proveedor es posicional (i+1) y se DESPLAZA al añadirse eliminatorias, lo
    // que chocaba con el unique y tiraba el sync (500). Los existentes conservan
    // el suyo; los nuevos cogen el del proveedor si está libre, si no el
    // siguiente libre.
    let matchNo: number;
    if (prev) {
      matchNo = prev.matchNo;
    } else {
      matchNo = f.matchNo;
      while (usedMatchNos.has(matchNo)) matchNo++;
      usedMatchNos.add(matchNo);
    }

    const data = buildData(f, status);
    const createData = { ...data, matchNo };
    if (f.externalId) {
      await prisma.match.upsert({
        where: { externalId: f.externalId },
        create: createData,
        update: data, // UPDATE no toca matchNo
      });
    } else {
      await prisma.match.upsert({
        where: { matchNo },
        create: createData,
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
