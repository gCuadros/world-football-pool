import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMatchesView } from "@/lib/queries";

// GET /api/matches/[id] — detalle del partido + predicción del usuario.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const matches = await getMatchesView(session.user.id);
  const match = matches.find((m) => m.id === id);

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  return NextResponse.json(match);
}
