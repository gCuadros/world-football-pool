// Regenera el snapshot estático de físicas FIFA (EFI) del Mundial:
//   src/data/fifa-physical-wc26.json
//
// La FIFA no expone estas métricas en vivo; la fuente es el bundle de la app de
// referencia (configurable con FIFA_PHYSICAL_SOURCE_URL). Este snapshot es el
// baseline/fallback del repo (en runtime, el cron las refresca a la BD).
//
// Uso:  yarn fetch:physical
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SOURCE_URL =
  process.env.FIFA_PHYSICAL_SOURCE_URL ?? "https://fifaphy.vercel.app/data.js";

const POS = { 0: "Portero", 1: "Defensa", 2: "Centrocampista", 3: "Delantero" };
const round = (x, n = 0) => (x == null ? null : Number(x.toFixed(n)));

// Extrae el objeto literal de `const TOURNAMENTS = {...};`, consciente de
// strings para no contar llaves dentro de comillas.
function extractObject(text) {
  const start = text.indexOf("{", text.indexOf("TOURNAMENTS"));
  if (start < 0) throw new Error("TOURNAMENTS no encontrado en la fuente");
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
  throw new Error("Objeto TOURNAMENTS sin cerrar");
}

async function main() {
  console.log(`Descargando físicas desde ${SOURCE_URL} …`);
  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = extractObject(await res.text());
  const records = data?.wc26?.data?.records ?? [];

  const out = {};
  for (const r of records) {
    const m = r.metrics ?? {};
    const dist = m.TotalDistance ?? 0;
    if (!dist || dist <= 0) continue;
    (out[r.matchId] ??= []).push({
      name: r.name,
      team: r.teamCode ?? null,
      pos: r.position != null ? (POS[r.position] ?? null) : null,
      dist: round(dist),
      sprints: m.Sprints ?? null,
      topSpeed: round(m.TopSpeed, 1),
      speedRuns: m.SpeedRuns ?? null,
      hsSprint: round(m.DistanceHighSpeedSprinting),
      minPlayed: round((m.TimePlayed ?? 0) / 60),
    });
  }

  const dest = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../src/data/fifa-physical-wc26.json",
  );
  writeFileSync(dest, JSON.stringify(out));

  const matches = Object.keys(out).length;
  const players = Object.values(out).reduce((n, v) => n + v.length, 0);
  console.log(`OK: ${matches} partidos, ${players} jugadores → ${dest}`);
  if (matches === 0) console.warn("⚠️  0 partidos: ¿cambió el formato de la fuente?");
}

main().catch((e) => {
  console.error("Error regenerando físicas:", e.message);
  process.exit(1);
});
