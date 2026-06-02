import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserLeagues } from "@/lib/leaderboard";

// GET /api/user/stats — ligas y primera liga del usuario autenticado.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const leagues = await getUserLeagues(session.user.id);
  return NextResponse.json({ leagues });
}
