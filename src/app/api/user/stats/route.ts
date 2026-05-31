import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserStatsView } from "@/lib/queries";

// GET /api/user/stats — estadísticas del usuario autenticado.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const stats = await getUserStatsView(session.user.id);
  return NextResponse.json(stats);
}
