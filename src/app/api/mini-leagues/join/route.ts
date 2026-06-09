import { NextResponse } from "next/server";

import { joinLeague } from "@/app/(shell)/(app)/mini-ligas/actions";

// POST /api/mini-leagues/join — unirse con código. Body: { code }.
export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const res = await joinLeague(body.code ?? "");
  if (res.ok) return NextResponse.json({ ok: true });

  const status = res.error.includes("Sesión")
    ? 401
    : res.error.includes("No existe")
      ? 404
      : 400;
  return NextResponse.json({ error: res.error }, { status });
}
