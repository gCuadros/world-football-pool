import { NextResponse } from "next/server";

import { savePrediction } from "@/app/(app)/predicciones/actions";

// POST /api/predictions — crea/actualiza una predicción.
// Body: { leagueId, matchId, homeScore, awayScore }.
export async function POST(req: Request) {
  let body: { leagueId?: string; matchId?: string; homeScore?: number; awayScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  if (!body.leagueId || !body.matchId) {
    return NextResponse.json({ error: "leagueId y matchId requeridos" }, { status: 400 });
  }

  const res = await savePrediction(
    body.leagueId,
    body.matchId,
    Number(body.homeScore),
    Number(body.awayScore),
  );

  if (res.ok) return NextResponse.json({ ok: true }, { status: 201 });

  const status = res.error.includes("cerradas")
    ? 403
    : res.error.includes("Sesión")
      ? 401
      : 400;
  return NextResponse.json({ error: res.error }, { status });
}
