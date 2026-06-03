import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { generatePredictionReminders } from "@/lib/notification-triggers";

/**
 * POST /api/cron/reminders — recordatorios de predicción. Cadencia sugerida:
 * cada hora. Avisa a quienes están en una liga y no han predicho un partido que
 * arranca pronto. No usa la API de fútbol (solo BD).
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const hours = Number(url.searchParams.get("hours") ?? 6);
  const created = await generatePredictionReminders(
    Number.isFinite(hours) ? hours : 6,
  );

  return NextResponse.json({ ok: true, created });
}
