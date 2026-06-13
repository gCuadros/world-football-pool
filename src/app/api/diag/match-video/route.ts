import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Diagnóstico (solo responsable): ejecuta cada paso del descubrimiento de
// vídeos con fetches DIRECTOS (sin caché) para ver qué devuelve YouTube desde
// el entorno de producción. GET /api/diag/match-video?home=España&away=Arabia%20Saudí&kind=previa
const DIAGNOSTICS_EMAIL = "gonzalo.cuadros@gmail.com";
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

function collectLockups(node: unknown, out: { videoId: string; title: string }[]): void {
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  const lv = o.lockupViewModel as { contentId?: string } | undefined;
  if (lv?.contentId) {
    let title: string | null = null;
    const findTitle = (x: unknown): void => {
      if (title || !x || typeof x !== "object") return;
      const obj = x as Record<string, unknown>;
      const meta = obj.lockupMetadataViewModel as { title?: { content?: string } } | undefined;
      if (meta?.title?.content) {
        title = meta.title.content;
        return;
      }
      for (const k in obj) findTitle(obj[k]);
    };
    findTitle(lv);
    if (title) out.push({ videoId: lv.contentId, title });
  }
  for (const k in o) collectLockups(o[k], out);
}

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

  // 1. RSS
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      headers: { "user-agent": "QuinielaMundial2026/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    const xml = await r.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
    const titles = entries
      .map((b) => b.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "")
      .filter(Boolean);
    result.rss = {
      status: r.status,
      bytes: xml.length,
      entries: entries.length,
      matched: titles.some(matchesVid),
      sampleTitles: titles.slice(0, 3),
    };
  } catch (e) {
    result.rss = { error: String(e) };
  }

  // 2. Browse de la pestaña "Vídeos" del canal (método de producción).
  try {
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "es", gl: "US" } },
        browseId: CHANNEL_ID,
        params: "EgZ2aWRlb3PyBgQKAjoA",
      }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    const vids: { videoId: string; title: string }[] = [];
    let parseError: string | null = null;
    try {
      collectLockups(JSON.parse(text), vids);
    } catch (e) {
      parseError = String(e);
    }
    result.channel = {
      status: r.status,
      bytes: text.length,
      parseError,
      videos: vids.length,
      sampleTitles: vids.slice(0, 5).map((v) => v.title),
      matched: vids.some((v) => matchesVid(v.title)),
      bodyHead: text.slice(0, 200),
    };
  } catch (e) {
    result.channel = { error: String(e) };
  }

  return NextResponse.json(result, { status: 200 });
}
