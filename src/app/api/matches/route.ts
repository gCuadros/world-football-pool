import { NextResponse } from "next/server";

import { getMatchesBase } from "@/lib/queries";

// GET /api/matches — lista pública de partidos (sin predicciones de usuario).
export async function GET(req: Request) {
  const matches = await getMatchesBase();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const stage = url.searchParams.get("stage");

  let result = matches;
  if (status) result = result.filter((m) => m.status === status);
  if (stage) result = result.filter((m) => m.stage === stage);

  return NextResponse.json(result);
}
