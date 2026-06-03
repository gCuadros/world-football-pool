import "server-only";

import { cacheLife, cacheTag } from "next/cache";

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  image: string | null;
  isoDate: string | null;
};

// Fuentes RSS de fútbol en español (sin clave). Si alguna falla, se ignora.
const FEEDS: { url: string; source: string }[] = [
  { url: "https://e00-marca.uecdn.es/rss/futbol/mundial.xml", source: "Marca" },
  { url: "https://www.mundodeportivo.com/feed/rss/futbol/", source: "Mundo Deportivo" },
  { url: "https://api.as.com/an/rss/diarioas/portada_futbol.xml", source: "AS" },
];

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : null;
}

function pickImage(block: string): string | null {
  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"/i);
  if (enclosure) return enclosure[1];
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i);
  if (media) return media[1];
  const desc = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
  const img = desc?.[1].match(/<img[^>]*src="([^"]+)"/i);
  return img ? img[1] : null;
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "QuinielaMundial2026/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    return items
      .map((block) => {
        const title = pick(block, "title");
        const link = pick(block, "link");
        if (!title || !link) return null;
        const pubDate = pick(block, "pubDate");
        return {
          title,
          link,
          source,
          image: pickImage(block),
          isoDate: pubDate ? new Date(pubDate).toISOString() : null,
        } satisfies NewsItem;
      })
      .filter((x): x is NewsItem => x !== null)
      .slice(0, 12);
  } catch {
    return [];
  }
}

/**
 * Titulares de fútbol del Mundial desde varias fuentes RSS (sin clave).
 * CACHEADO (`use cache`): se regenera cada ~30 min. Resiliente: si todas las
 * fuentes fallan, devuelve lista vacía y la página muestra un estado vacío.
 */
export async function getNews(): Promise<NewsItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news");

  const results = await Promise.all(FEEDS.map((f) => fetchFeed(f.url, f.source)));
  const all = results.flat();

  // Dedupe por título y orden por fecha desc.
  const seen = new Set<string>();
  const deduped = all.filter((n) => {
    const key = n.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => {
    const ta = a.isoDate ? Date.parse(a.isoDate) : 0;
    const tb = b.isoDate ? Date.parse(b.isoDate) : 0;
    return tb - ta;
  });

  return deduped.slice(0, 24);
}
