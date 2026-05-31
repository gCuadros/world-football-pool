import { NextResponse } from "next/server";

import { savePrediction } from "@/app/(app)/predicciones/actions";

// PATCH /api/predictions/[id] — actualiza la predicción de un partido.
// [id] = matchId. Body: { homeScore, awayScore }. Devuelve 403 si está cerrada.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { homeScore?: number; awayScore?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const res = await savePrediction(id, Number(body.homeScore), Number(body.awayScore));

  if (res.ok) return NextResponse.json({ ok: true });

  const status = res.error.includes("cerradas")
    ? 403
    : res.error.includes("Sesión")
      ? 401
      : 400;
  return NextResponse.json({ error: res.error }, { status });
}
