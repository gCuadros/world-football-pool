import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCommunityDistribution } from "@/lib/queries";

// GET /api/predictions/community/[matchId]
// Distribución agregada de predicciones. Solo accesible tras el kickoff
// (privacidad): antes, getCommunityDistribution devuelve null → 403.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { matchId } = await params;
  const distribution = await getCommunityDistribution(matchId);

  if (!distribution) {
    return NextResponse.json(
      { error: "Distribución no disponible hasta el inicio del partido." },
      { status: 403 },
    );
  }

  return NextResponse.json(distribution);
}
