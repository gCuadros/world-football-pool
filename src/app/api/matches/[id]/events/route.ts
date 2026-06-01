import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMatchEvents } from "@/lib/queries";

// GET /api/matches/[id]/events — eventos (goles/tarjetas) de un partido.
// Solo tras el inicio (LIVE/FINISHED) y si el partido tiene externalId.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    select: { externalId: true, status: true },
  });

  if (!match || match.status === "UPCOMING" || !match.externalId) {
    return NextResponse.json({ events: [] });
  }

  const events = await getMatchEvents(match.externalId);
  return NextResponse.json({ events });
}
