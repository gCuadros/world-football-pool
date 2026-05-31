import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getLeaderboard } from "@/lib/leaderboard";

// GET /api/leaderboard — clasificación general.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const rows = await getLeaderboard(session.user.id);
  return NextResponse.json(rows);
}
