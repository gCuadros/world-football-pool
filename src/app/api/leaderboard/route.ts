import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserLeagues, getLeagueLeaderboard } from "@/lib/leaderboard";

// GET /api/leaderboard?leagueId=xxx — clasificación de una liga.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const leagueId = url.searchParams.get("leagueId");

  if (!leagueId) {
    const leagues = await getUserLeagues(session.user.id);
    return NextResponse.json(leagues);
  }

  const rows = await getLeagueLeaderboard(leagueId, session.user.id);
  return NextResponse.json(rows);
}
