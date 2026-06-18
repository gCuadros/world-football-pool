import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { TAGS } from "@/lib/cache-tags";
import { refreshPhysical } from "@/lib/fifa-physical-sync";

/**
 * POST /api/cron/physical — refresca las físicas oficiales FIFA en BD desde la
 * fuente. Pensado para correr tras la jornada (red de seguridad además del
 * trigger al finalizar cada partido). Idempotente.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { updated } = await refreshPhysical();
    revalidateTag(TAGS.matches, "max");
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
