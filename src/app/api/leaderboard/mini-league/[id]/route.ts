import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLeagueLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

// GET /api/leaderboard/mini-league/[id] — ranking interno de una liga.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await prisma.miniLeagueMember.findUnique({
    where: { userId_miniLeagueId: { userId: session.user.id, miniLeagueId: id } },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Liga no encontrada o no eres miembro" },
      { status: 404 },
    );
  }

  const rows = await getLeagueLeaderboard(id, session.user.id);
  return NextResponse.json({ rows });
}
