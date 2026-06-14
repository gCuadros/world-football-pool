import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Diagnóstico (solo responsable): vuelca las playlists de FIFA (previas y
// highlights) con fetch DIRECTO (sin caché) para ver desde producción qué hay
// y si la Data API responde. GET /api/diag/match-video
const DIAGNOSTICS_EMAIL = "gonzalo.cuadros@gmail.com";
const PLAYLISTS = {
  previa: "PLOKG1WmvypGc", // Match Previews
  resumen: "PLBRLtDhTHh5o", // Match Highlights
} as const;

async function dumpPlaylist(id: string, key: string) {
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=50&key=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const json = (await r.json()) as {
      items?: { snippet?: { title?: string } }[];
      error?: { message?: string };
    };
    return {
      status: r.status,
      apiError: json.error?.message ?? null,
      items: json.items?.length ?? 0,
      titles: (json.items ?? []).map((it) => it.snippet?.title ?? "").filter(Boolean),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== DIAGNOSTICS_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ dataApi: { skipped: "YOUTUBE_API_KEY no configurada" } });
  }

  const [previa, resumen] = await Promise.all([
    dumpPlaylist(PLAYLISTS.previa, key),
    dumpPlaylist(PLAYLISTS.resumen, key),
  ]);

  return NextResponse.json({ previa, resumen });
}
