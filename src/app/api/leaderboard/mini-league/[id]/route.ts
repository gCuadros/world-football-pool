import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMiniLeaguesForUser } from "@/lib/leaderboard";

// GET /api/leaderboard/mini-league/[id] — ranking interno de una mini-liga
// (solo si el usuario es miembro).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const leagues = await getMiniLeaguesForUser(session.user.id);
  const league = leagues.find((l) => l.id === id);

  if (!league) {
    return NextResponse.json(
      { error: "Liga no encontrada o no eres miembro" },
      { status: 404 },
    );
  }
  return NextResponse.json(league);
}
