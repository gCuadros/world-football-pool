import type { Stage } from "@prisma/client";

// Datos de referencia del Mundial 2026 para mapear los nombres en inglés de
// openfootball a nombres en español + bandera, y las sedes a estadios reales.

export type TeamInfo = { name: string; flag: string | null };

// Los 48 equipos (nombre EN de openfootball → ES + emoji de bandera).
const TEAMS: Record<string, TeamInfo> = {
  Algeria: { name: "Argelia", flag: "🇩🇿" },
  Argentina: { name: "Argentina", flag: "🇦🇷" },
  Australia: { name: "Australia", flag: "🇦🇺" },
  Austria: { name: "Austria", flag: "🇦🇹" },
  Belgium: { name: "Bélgica", flag: "🇧🇪" },
  "Bosnia & Herzegovina": { name: "Bosnia y Herzegovina", flag: "🇧🇦" },
  Brazil: { name: "Brasil", flag: "🇧🇷" },
  Canada: { name: "Canadá", flag: "🇨🇦" },
  "Cape Verde": { name: "Cabo Verde", flag: "🇨🇻" },
  Colombia: { name: "Colombia", flag: "🇨🇴" },
  Croatia: { name: "Croacia", flag: "🇭🇷" },
  "Curaçao": { name: "Curazao", flag: "🇨🇼" },
  "Czech Republic": { name: "Chequia", flag: "🇨🇿" },
  "DR Congo": { name: "RD Congo", flag: "🇨🇩" },
  Ecuador: { name: "Ecuador", flag: "🇪🇨" },
  Egypt: { name: "Egipto", flag: "🇪🇬" },
  England: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  France: { name: "Francia", flag: "🇫🇷" },
  Germany: { name: "Alemania", flag: "🇩🇪" },
  Ghana: { name: "Ghana", flag: "🇬🇭" },
  Haiti: { name: "Haití", flag: "🇭🇹" },
  Iran: { name: "Irán", flag: "🇮🇷" },
  Iraq: { name: "Irak", flag: "🇮🇶" },
  "Ivory Coast": { name: "Costa de Marfil", flag: "🇨🇮" },
  Japan: { name: "Japón", flag: "🇯🇵" },
  Jordan: { name: "Jordania", flag: "🇯🇴" },
  Mexico: { name: "México", flag: "🇲🇽" },
  Morocco: { name: "Marruecos", flag: "🇲🇦" },
  Netherlands: { name: "Países Bajos", flag: "🇳🇱" },
  "New Zealand": { name: "Nueva Zelanda", flag: "🇳🇿" },
  Norway: { name: "Noruega", flag: "🇳🇴" },
  Panama: { name: "Panamá", flag: "🇵🇦" },
  Paraguay: { name: "Paraguay", flag: "🇵🇾" },
  Portugal: { name: "Portugal", flag: "🇵🇹" },
  Qatar: { name: "Catar", flag: "🇶🇦" },
  "Saudi Arabia": { name: "Arabia Saudí", flag: "🇸🇦" },
  Scotland: { name: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  Senegal: { name: "Senegal", flag: "🇸🇳" },
  "South Africa": { name: "Sudáfrica", flag: "🇿🇦" },
  "South Korea": { name: "Corea del Sur", flag: "🇰🇷" },
  Spain: { name: "España", flag: "🇪🇸" },
  Sweden: { name: "Suecia", flag: "🇸🇪" },
  Switzerland: { name: "Suiza", flag: "🇨🇭" },
  Tunisia: { name: "Túnez", flag: "🇹🇳" },
  Turkey: { name: "Turquía", flag: "🇹🇷" },
  USA: { name: "Estados Unidos", flag: "🇺🇸" },
  Uruguay: { name: "Uruguay", flag: "🇺🇾" },
  Uzbekistan: { name: "Uzbekistán", flag: "🇺🇿" },
};

// Sedes (ground de openfootball → estadio + ciudad en español).
const STADIUMS: Record<string, { stadium: string; city: string }> = {
  Atlanta: { stadium: "Mercedes-Benz Stadium", city: "Atlanta" },
  "Boston (Foxborough)": { stadium: "Gillette Stadium", city: "Boston" },
  "Dallas (Arlington)": { stadium: "AT&T Stadium", city: "Dallas" },
  "Guadalajara (Zapopan)": { stadium: "Estadio Akron", city: "Guadalajara" },
  Houston: { stadium: "NRG Stadium", city: "Houston" },
  "Kansas City": { stadium: "Arrowhead Stadium", city: "Kansas City" },
  "Los Angeles (Inglewood)": { stadium: "SoFi Stadium", city: "Los Ángeles" },
  "Mexico City": { stadium: "Estadio Azteca", city: "Ciudad de México" },
  "Miami (Miami Gardens)": { stadium: "Hard Rock Stadium", city: "Miami" },
  "Monterrey (Guadalupe)": { stadium: "Estadio BBVA", city: "Monterrey" },
  "New York/New Jersey (East Rutherford)": {
    stadium: "MetLife Stadium",
    city: "Nueva York / NJ",
  },
  Philadelphia: { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  "San Francisco Bay Area (Santa Clara)": {
    stadium: "Levi's Stadium",
    city: "Bahía de San Francisco",
  },
  Seattle: { stadium: "Lumen Field", city: "Seattle" },
  Toronto: { stadium: "BMO Field", city: "Toronto" },
  Vancouver: { stadium: "BC Place", city: "Vancouver" },
};

/** Resuelve un nombre de equipo (país real o placeholder de eliminatoria). */
export function resolveTeam(token: string): TeamInfo {
  const known = TEAMS[token];
  if (known) return known;

  // Placeholders de eliminatoria (sin bandera).
  // 1A/2B = posición de grupo; 3X/Y = mejores terceros; W## = ganador; L## = perdedor.
  let name = token;
  const posMatch = /^([123])([A-L])$/.exec(token);
  if (posMatch) {
    name = `${posMatch[1]}.º Grupo ${posMatch[2]}`;
  } else if (/^3[A-L/]+$/.test(token)) {
    name = `Mejor 3.º (${token.slice(1)})`;
  } else if (/^W\d+$/.test(token)) {
    name = `Ganador P${token.slice(1)}`;
  } else if (/^L\d+$/.test(token)) {
    name = `Perdedor P${token.slice(1)}`;
  }
  return { name, flag: null };
}

export function resolveGround(ground: string): { stadium: string; city: string } {
  return STADIUMS[ground] ?? { stadium: ground, city: ground };
}

/** Convierte el `round` de openfootball al enum Stage. */
export function roundToStage(round: string): Stage {
  if (round.startsWith("Matchday")) return "GROUP_STAGE";
  switch (round) {
    case "Round of 32":
      return "ROUND_OF_32";
    case "Round of 16":
      return "ROUND_OF_16";
    case "Quarter-final":
      return "QUARTER_FINAL";
    case "Semi-final":
      return "SEMI_FINAL";
    case "Match for third place":
      return "THIRD_PLACE";
    case "Final":
      return "FINAL";
    default:
      return "GROUP_STAGE";
  }
}

/** "Group A" → "A"; null si no es fase de grupos. */
export function parseGroup(group?: string | null): string | null {
  if (!group) return null;
  return group.replace("Group ", "").trim();
}

/**
 * Combina fecha (YYYY-MM-DD) y hora ("13:00 UTC-6") en un Date UTC.
 * El offset del JSON indica la zona local de la sede.
 */
export function parseKickoff(date: string, time: string): Date {
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})?/.exec(time.trim());
  const hour = m ? Number(m[1]) : 12;
  const minute = m ? Number(m[2]) : 0;
  const offset = m && m[3] ? Number(m[3]) : 0;
  const [y, mo, d] = date.split("-").map(Number);
  // Hora local de la sede → UTC restando el offset.
  return new Date(Date.UTC(y, mo - 1, d, hour - offset, minute));
}
