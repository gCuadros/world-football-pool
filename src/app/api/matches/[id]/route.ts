import { NextResponse } from "next/server";

import { getMatchesBase } from "@/lib/queries";

// GET /api/matches/[id] — detalle de un partido (datos públicos).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const matches = await getMatchesBase();
  const match = matches.find((m) => m.id === id);

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  return NextResponse.json(match);
}
