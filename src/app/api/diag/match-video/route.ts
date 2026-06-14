import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Diagnóstico (solo responsable): ejecuta cada paso del descubrimiento de
// vídeos con fetches DIRECTOS (sin caché) para ver qué pasa desde producción.
// GET /api/diag/match-video?home=España&away=Arabia%20Saudí&kind=previa
const DIAGNOSTICS_EMAIL = "gonzalo.cuadros@gmail.com";
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.email !== DIAGNOSTICS_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(req.url);
  const home = url.searchParams.get("home") ?? "España";
  const away = url.searchParams.get("away") ?? "Arabia Saudí";
  const kind = url.searchParams.get("kind") ?? "previa";
  const keyword = kind === "previa" ? "PREVIA" : "RESUMEN";
  const matchesVid = (title: string) =>
    norm(title).includes(keyword) && norm(title).includes(norm(home)) && norm(title).includes(norm(away));

  const result: Record<string, unknown> = { home, away, kind };

  // 1. RSS (gratis)
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      headers: { "user-agent": "QuinielaMundial2026/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    const xml = await r.text();
    const titles = (xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [])
      .map((b) => b.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "")
      .filter(Boolean);
    result.rss = {
      status: r.status,
      entries: titles.length,
      matched: titles.some(matchesVid),
      sampleTitles: titles.slice(0, 3),
    };
  } catch (e) {
    result.rss = { error: String(e) };
  }

  // 2. YouTube Data API (oficial, fiable desde Vercel)
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    result.dataApi = { skipped: "YOUTUBE_API_KEY no configurada" };
  } else {
    try {
      const uploads = `UU${CHANNEL_ID.slice(2)}`;
      const apiUrl =
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
        `&playlistId=${uploads}&maxResults=50&key=${key}`;
      const r = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
      const json = (await r.json()) as {
        items?: { snippet?: { title?: string } }[];
        error?: { message?: string };
      };
      const titles = (json.items ?? []).map((it) => it.snippet?.title ?? "").filter(Boolean);
      result.dataApi = {
        status: r.status,
        apiError: json.error?.message ?? null,
        items: json.items?.length ?? 0,
        matched: titles.some(matchesVid),
        matchedTitle: titles.find(matchesVid) ?? null,
      };
    } catch (e) {
      result.dataApi = { error: String(e) };
    }
  }

  return NextResponse.json(result, { status: 200 });
}
