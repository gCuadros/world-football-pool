import { NextResponse } from "next/server";

import { savePrediction } from "@/app/(app)/predicciones/actions";

// PATCH /api/predictions/[id] — actualiza la predicción de un partido en una liga.
// [id] = matchId. Body: { leagueId, homeScore, awayScore }.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { leagueId?: string; homeScore?: number; awayScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  if (!body.leagueId) {
    return NextResponse.json({ error: "leagueId requerido" }, { status: 400 });
  }

  const res = await savePrediction(body.leagueId, id, Number(body.homeScore), Number(body.awayScore));

  if (res.ok) return NextResponse.json({ ok: true });

  const status = res.error.includes("cerradas")
    ? 403
    : res.error.includes("Sesión")
      ? 401
      : 400;
  return NextResponse.json({ error: res.error }, { status });
}
