import { NextResponse } from "next/server";

import { createLeague } from "@/app/(app)/mini-ligas/actions";

// POST /api/mini-leagues — crea una liga. Body: { name }.
export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const res = await createLeague(body.name ?? "");
  if (res.ok) {
    return NextResponse.json({ ok: true, code: res.code }, { status: 201 });
  }
  const status = res.error.includes("Sesión") ? 401 : 400;
  return NextResponse.json({ error: res.error }, { status });
}
