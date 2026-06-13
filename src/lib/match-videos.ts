import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Canal @Replay (FIFA): sube PREVIAS antes de cada partido y RESÚMENES al
// terminar. Se descubren vía el feed RSS público de YouTube (sin API key).
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export type MatchVideoKind = "previa" | "resumen";

type ReplayVideo = {
  videoId: string;
  title: string;
};

/** Normaliza para comparar: sin acentos, mayúsculas, espacios colapsados. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Últimos vídeos del canal (Atom feed: ~15 más recientes). Resiliente: si el
 * feed falla, devuelve []. El feed solo trae los recientes, así que cubre los
 * partidos en curso/recientes (previa antes, resumen justo después).
 */
async function fetchReplayFeed(): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  try {
    const res = await fetch(FEED_URL, {
      headers: { "user-agent": "QuinielaMundial2026/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
    return entries
      .map((block) => {
        const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1];
        const title = block.match(/<title>([^<]*)<\/title>/i)?.[1];
        return videoId && title ? { videoId, title } : null;
      })
      .filter((v): v is ReplayVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * Busca el vídeo (previa o resumen) del canal para un partido concreto,
 * emparejando por los DOS nombres de equipo en el título + la palabra clave.
 * Insensible al orden local/visitante. Devuelve el id de YouTube o null si
 * todavía no está disponible.
 *
 * Títulos del canal:
 *  - Resumen: "México 2 – 0 Sudáfrica | Resumen Copa Mundial de la FIFA 2026"
 *  - Previa:  "PREVIA GHANA - PANAMÁ | MUNDIAL 2026"
 */
export async function getMatchVideo(
  homeTeam: string,
  awayTeam: string,
  kind: MatchVideoKind,
): Promise<string | null> {
  const videos = await fetchReplayFeed();
  if (videos.length === 0) return null;

  const home = normalize(homeTeam);
  const away = normalize(awayTeam);
  const keyword = kind === "previa" ? "PREVIA" : "RESUMEN";

  const found = videos.find((v) => {
    const t = normalize(v.title);
    return t.includes(keyword) && t.includes(home) && t.includes(away);
  });

  return found?.videoId ?? null;
}
