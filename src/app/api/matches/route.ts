import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMatchesView } from "@/lib/queries";

// GET /api/matches?status=LIVE&stage=GROUP_STAGE
// Lista de partidos con la predicción del usuario autenticado incrustada.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const matches = await getMatchesView(session.user.id);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const stage = url.searchParams.get("stage");

  let result = matches;
  if (status) result = result.filter((m) => m.status === status);
  if (stage) result = result.filter((m) => m.stage === stage);

  return NextResponse.json(result);
}
