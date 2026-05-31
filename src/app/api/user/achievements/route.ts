import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUnlockedAchievements } from "@/lib/leaderboard";
import { ACHIEVEMENTS } from "@/lib/achievements";

// GET /api/user/achievements — catálogo de logros con estado del usuario.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const unlocked = await getUnlockedAchievements(session.user.id);
  const payload = ACHIEVEMENTS.map((a) => ({
    type: a.type,
    label: a.label,
    description: a.description,
    unlocked: unlocked.has(a.type),
  }));

  return NextResponse.json({
    total: ACHIEVEMENTS.length,
    unlockedCount: unlocked.size,
    achievements: payload,
  });
}
