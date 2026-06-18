import "server-only";

import { prisma } from "@/lib/prisma";
import { getFifaCalendar } from "@/lib/queries";
import { fetchPhysicalSource } from "@/lib/providers/fifa-physical-source";

/**
 * Refresca las físicas oficiales FIFA en BD (`Match.physical`) desde la fuente.
 * Une por matchNo === FIFA MatchNumber (vía el calendario). Si se pasa
 * `onlyMatchNo`, solo actualiza ese partido (uso al finalizar). Best-effort:
 * los partidos que no existan en BD se ignoran.
 */
export async function refreshPhysical(
  onlyMatchNo?: number,
): Promise<{ updated: number }> {
  const [source, cal] = await Promise.all([
    fetchPhysicalSource(),
    getFifaCalendar(),
  ]);

  // IdMatch FIFA → matchNo de la BD.
  const idToNo = new Map<string, number>();
  for (const [no, info] of Object.entries(cal)) {
    if (info.idMatch) idToNo.set(info.idMatch, Number(no));
  }

  let updated = 0;
  for (const [idMatch, players] of Object.entries(source)) {
    const matchNo = idToNo.get(idMatch);
    if (matchNo == null) continue;
    if (onlyMatchNo != null && matchNo !== onlyMatchNo) continue;
    try {
      await prisma.match.update({
        where: { matchNo },
        data: { physical: players },
      });
      updated++;
    } catch {
      // El partido no existe en BD (p. ej. fuera del torneo) → se ignora.
    }
  }
  return { updated };
}
