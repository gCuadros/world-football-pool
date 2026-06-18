import "server-only";

import type { PlayerPhysical } from "@/lib/providers/fifa-physical";

// Fuente de las físicas EFI (la FIFA no tiene endpoint en vivo): el bundle
// estático de la app de referencia, que su autor mantiene. Dependencia de
// terceros y frágil, pero la única disponible. Configurable por env.
const SOURCE_URL =
  process.env.FIFA_PHYSICAL_SOURCE_URL ?? "https://fifaphy.vercel.app/data.js";

const POS: Record<number, string> = {
  0: "Portero",
  1: "Defensa",
  2: "Centrocampista",
  3: "Delantero",
};

type SourceRecord = {
  name: string;
  teamCode: string | null;
  matchId: string;
  position: number | null;
  metrics: Record<string, number | null> | null;
};

// Extrae el objeto literal de `const TOURNAMENTS = {...};` (consciente de
// strings, para no contar llaves dentro de comillas).
function extractObject(text: string): unknown {
  const start = text.indexOf("{", text.indexOf("TOURNAMENTS"));
  if (start < 0) throw new Error("fifa-physical source: TOURNAMENTS no encontrado");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("fifa-physical source: objeto sin cerrar");
}

const round = (x: number | null | undefined, n = 0): number | null =>
  x == null ? null : Number(x.toFixed(n));

/** Físicas EFI del Mundial desde la fuente, agrupadas por IdMatch FIFA. */
export async function fetchPhysicalSource(): Promise<Record<string, PlayerPhysical[]>> {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fifa-physical source: HTTP ${res.status}`);
  const data = extractObject(await res.text()) as {
    wc26?: { data?: { records?: SourceRecord[] } };
  };
  const records = data?.wc26?.data?.records ?? [];

  const out: Record<string, PlayerPhysical[]> = {};
  for (const r of records) {
    const m = r.metrics ?? {};
    const dist = m.TotalDistance ?? 0;
    if (!dist || dist <= 0) continue;
    (out[r.matchId] ??= []).push({
      name: r.name,
      team: r.teamCode ?? null,
      pos: r.position != null ? (POS[r.position] ?? null) : null,
      dist: round(dist)!,
      sprints: m.Sprints ?? null,
      topSpeed: round(m.TopSpeed, 1),
      speedRuns: m.SpeedRuns ?? null,
      hsSprint: round(m.DistanceHighSpeedSprinting),
      minPlayed: round((m.TimePlayed ?? 0) / 60),
    });
  }
  return out;
}
