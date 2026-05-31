import { PrismaClient, Stage, MatchStatus, AchievementType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculatePoints, getResult } from "../src/lib/scoring";

const prisma = new PrismaClient();

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Pseudo-aleatorio determinista (mulberry32) para que el seed sea estable.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(...nums: number[]): number {
  let h = 2166136261;
  for (const n of nums) {
    h ^= n;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─────────────────────────────────────────────────────────────
// Equipos por grupo (formato clásico: 8 grupos × 4 = 32 equipos)
// ─────────────────────────────────────────────────────────────
const GROUPS: { group: string; teams: { name: string; flag: string }[] }[] = [
  { group: "A", teams: [
    { name: "México", flag: "🇲🇽" }, { name: "Croacia", flag: "🇭🇷" },
    { name: "Ecuador", flag: "🇪🇨" }, { name: "Ghana", flag: "🇬🇭" } ] },
  { group: "B", teams: [
    { name: "Canadá", flag: "🇨🇦" }, { name: "Bélgica", flag: "🇧🇪" },
    { name: "Marruecos", flag: "🇲🇦" }, { name: "Corea del Sur", flag: "🇰🇷" } ] },
  { group: "C", teams: [
    { name: "Estados Unidos", flag: "🇺🇸" }, { name: "Países Bajos", flag: "🇳🇱" },
    { name: "Japón", flag: "🇯🇵" }, { name: "Senegal", flag: "🇸🇳" } ] },
  { group: "D", teams: [
    { name: "Argentina", flag: "🇦🇷" }, { name: "Polonia", flag: "🇵🇱" },
    { name: "Australia", flag: "🇦🇺" }, { name: "Nigeria", flag: "🇳🇬" } ] },
  { group: "E", teams: [
    { name: "Francia", flag: "🇫🇷" }, { name: "Dinamarca", flag: "🇩🇰" },
    { name: "Uruguay", flag: "🇺🇾" }, { name: "Arabia Saudí", flag: "🇸🇦" } ] },
  { group: "F", teams: [
    { name: "Brasil", flag: "🇧🇷" }, { name: "Suiza", flag: "🇨🇭" },
    { name: "Serbia", flag: "🇷🇸" }, { name: "Camerún", flag: "🇨🇲" } ] },
  { group: "G", teams: [
    { name: "España", flag: "🇪🇸" }, { name: "Alemania", flag: "🇩🇪" },
    { name: "Costa Rica", flag: "🇨🇷" }, { name: "Irán", flag: "🇮🇷" } ] },
  { group: "H", teams: [
    { name: "Portugal", flag: "🇵🇹" }, { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Colombia", flag: "🇨🇴" }, { name: "Túnez", flag: "🇹🇳" } ] },
];

const VENUES: { stadium: string; city: string }[] = [
  { stadium: "MetLife Stadium", city: "Nueva York / NJ" },
  { stadium: "SoFi Stadium", city: "Los Ángeles" },
  { stadium: "AT&T Stadium", city: "Dallas" },
  { stadium: "Estadio Azteca", city: "Ciudad de México" },
  { stadium: "BC Place", city: "Vancouver" },
  { stadium: "Mercedes-Benz Stadium", city: "Atlanta" },
  { stadium: "NRG Stadium", city: "Houston" },
  { stadium: "Arrowhead Stadium", city: "Kansas City" },
  { stadium: "Lumen Field", city: "Seattle" },
  { stadium: "Levi's Stadium", city: "Bahía de San Francisco" },
  { stadium: "Hard Rock Stadium", city: "Miami" },
  { stadium: "Lincoln Financial Field", city: "Filadelfia" },
  { stadium: "Gillette Stadium", city: "Boston" },
  { stadium: "Estadio BBVA", city: "Monterrey" },
  { stadium: "Estadio Akron", city: "Guadalajara" },
  { stadium: "BMO Field", city: "Toronto" },
];

// Round-robin de 4 equipos (índices), 6 partidos por grupo.
const RR: [number, number][] = [
  [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
];

const FINISHED_SCORES: [number, number][] = [
  [2, 1], [0, 0], [1, 0], [3, 1], [2, 2], [1, 2], [0, 1], [2, 0],
];
const LIVE_SCORES: [number, number][] = [[1, 0], [0, 0], [2, 1]];

type MatchSeed = {
  matchNo: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: Date;
  stage: Stage;
  group: string | null;
  stadium: string;
  city: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  liveMinute: number | null;
};

function buildMatches(now: Date): MatchSeed[] {
  const matches: MatchSeed[] = [];
  let gi = 0; // índice global de partido de grupos
  let matchNo = 1;

  for (const { group, teams } of GROUPS) {
    for (const [h, a] of RR) {
      const venue = VENUES[gi % VENUES.length];
      let kickoffAt: Date;
      let status: MatchStatus = MatchStatus.UPCOMING;
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let liveMinute: number | null = null;

      if (gi < 6) {
        // Terminados (en las últimas ~48h).
        kickoffAt = new Date(now.getTime() - 2 * DAY + gi * 3 * HOUR);
        status = MatchStatus.FINISHED;
        [homeScore, awayScore] = FINISHED_SCORES[gi % FINISHED_SCORES.length];
      } else if (gi < 9) {
        // En directo ahora mismo.
        const minsAgo = 50 - (gi - 6) * 10; // 50, 40, 30
        kickoffAt = new Date(now.getTime() - minsAgo * MIN);
        status = MatchStatus.LIVE;
        liveMinute = minsAgo;
        [homeScore, awayScore] = LIVE_SCORES[(gi - 6) % LIVE_SCORES.length];
      } else if (gi === 9) {
        // Cierre inminente: arranca en ~13 min (predicciones cerrándose).
        kickoffAt = new Date(now.getTime() + 13 * MIN);
      } else if (gi < 12) {
        // Próximas horas.
        kickoffAt = new Date(now.getTime() + (2 + (gi - 10)) * HOUR);
      } else {
        // Resto de la fase de grupos repartido en los próximos días.
        const dayOffset = 1 + Math.floor((gi - 12) / 3);
        const slot = (gi - 12) % 3;
        kickoffAt = new Date(now.getTime() + dayOffset * DAY + slot * 5 * HOUR + 18 * HOUR);
      }

      matches.push({
        matchNo: matchNo++,
        homeTeam: teams[h].name,
        awayTeam: teams[a].name,
        homeFlag: teams[h].flag,
        awayFlag: teams[a].flag,
        kickoffAt,
        stage: Stage.GROUP_STAGE,
        group,
        stadium: venue.stadium,
        city: venue.city,
        homeScore,
        awayScore,
        status,
        liveMinute,
      });
      gi++;
    }
  }

  // Eliminatorias con equipos por determinar (placeholders).
  const knockout: { stage: Stage; home: string; away: string; days: number }[] = [];
  const r16Pairs = [
    ["1A", "2B"], ["1C", "2D"], ["1E", "2F"], ["1G", "2H"],
    ["1B", "2A"], ["1D", "2C"], ["1F", "2E"], ["1H", "2G"],
  ];
  r16Pairs.forEach(([home, away], i) =>
    knockout.push({ stage: Stage.ROUND_OF_16, home, away, days: 20 + Math.floor(i / 2) }),
  );
  for (let i = 0; i < 4; i++)
    knockout.push({ stage: Stage.QUARTER_FINAL, home: `Ganador OF${i * 2 + 1}`, away: `Ganador OF${i * 2 + 2}`, days: 26 + Math.floor(i / 2) });
  for (let i = 0; i < 2; i++)
    knockout.push({ stage: Stage.SEMI_FINAL, home: `Ganador CF${i * 2 + 1}`, away: `Ganador CF${i * 2 + 2}`, days: 31 + i });
  knockout.push({ stage: Stage.THIRD_PLACE, home: "Perdedor SF1", away: "Perdedor SF2", days: 37 });
  knockout.push({ stage: Stage.FINAL, home: "Ganador SF1", away: "Ganador SF2", days: 38 });

  knockout.forEach((k, i) => {
    matches.push({
      matchNo: matchNo++,
      homeTeam: k.home,
      awayTeam: k.away,
      homeFlag: null,
      awayFlag: null,
      kickoffAt: new Date(now.getTime() + k.days * DAY + 19 * HOUR),
      stage: k.stage,
      group: null,
      stadium: VENUES[i % VENUES.length].stadium,
      city: VENUES[i % VENUES.length].city,
      homeScore: null,
      awayScore: null,
      status: MatchStatus.UPCOMING,
      liveMinute: null,
    });
  });

  return matches;
}

// ─────────────────────────────────────────────────────────────
// Usuarios demo
// ─────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: "gonzalo@quiniela.app", name: "Gonzalo Cuadros", skill: 0.78 },
  { email: "lucia@quiniela.app", name: "Lucía Fernández", skill: 0.92 },
  { email: "marco@quiniela.app", name: "Marco Rossi", skill: 0.85 },
  { email: "aisha@quiniela.app", name: "Aisha Khan", skill: 0.7 },
  { email: "diego@quiniela.app", name: "Diego Martín", skill: 0.62 },
  { email: "sara@quiniela.app", name: "Sara López", skill: 0.55 },
  { email: "kenji@quiniela.app", name: "Kenji Tanaka", skill: 0.48 },
  { email: "nora@quiniela.app", name: "Nora Becker", skill: 0.4 },
];

function predictFor(
  userIdx: number,
  skill: number,
  match: MatchSeed,
): { homeScore: number; awayScore: number } {
  const rnd = mulberry32(hash(userIdx + 1, match.matchNo));
  const roll = rnd();

  // Para partidos con marcador conocido, sesgar según habilidad.
  if (match.homeScore !== null && match.awayScore !== null) {
    const h = match.homeScore;
    const a = match.awayScore;
    if (roll < skill * 0.4) {
      return { homeScore: h, awayScore: a }; // exacto
    }
    if (roll < skill * 0.75) {
      // resultado correcto, marcador distinto
      const res = getResult(h, a);
      if (res === "HOME") return { homeScore: h + 1, awayScore: a };
      if (res === "AWAY") return { homeScore: h, awayScore: a + 1 };
      return { homeScore: h + 1, awayScore: a + 1 };
    }
    // fallo: invertir tendencia
    const res = getResult(h, a);
    if (res === "DRAW") return { homeScore: h + 1, awayScore: a };
    return { homeScore: a, awayScore: h };
  }

  // Partidos sin resultado: predicción plausible.
  return { homeScore: Math.floor(rnd() * 4), awayScore: Math.floor(rnd() * 3) };
}

async function main() {
  const now = new Date();
  console.log("🌱 Sembrando Quiniela Mundial 2026…");

  // Limpieza idempotente.
  await prisma.achievement.deleteMany();
  await prisma.leaderboardSnapshot.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.miniLeagueMember.deleteMany();
  await prisma.miniLeague.deleteMany();
  await prisma.match.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Partidos.
  const matchSeeds = buildMatches(now);
  await prisma.match.createMany({ data: matchSeeds });
  const matches = await prisma.match.findMany({ orderBy: { matchNo: "asc" } });
  console.log(`  ✓ ${matches.length} partidos`);

  // Usuarios.
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
        avatar: u.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      },
    });
    users.push({ ...user, skill: u.skill });
  }
  console.log(`  ✓ ${users.length} usuarios (contraseña: password123)`);

  // Predicciones (todos los terminados/en vivo + algunos próximos).
  const predictableMatches = matches.filter(
    (m) =>
      m.status === "FINISHED" ||
      m.status === "LIVE" ||
      (m.status === "UPCOMING" && m.matchNo <= 16),
  );

  let predCount = 0;
  for (let ui = 0; ui < users.length; ui++) {
    const user = users[ui];
    for (const m of predictableMatches) {
      // No todos predicen todo: el usuario principal predice todo; otros ~85%.
      const rnd = mulberry32(hash(ui + 100, m.matchNo));
      if (ui !== 0 && rnd() > 0.85) continue;

      const seed = matchSeeds.find((s) => s.matchNo === m.matchNo)!;
      const p = predictFor(ui, user.skill, seed);
      const points = calculatePoints(p, {
        homeScore: m.status === "FINISHED" ? m.homeScore : null,
        awayScore: m.status === "FINISHED" ? m.awayScore : null,
      });

      await prisma.prediction.create({
        data: {
          userId: user.id,
          matchId: m.id,
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          points,
        },
      });
      predCount++;
    }
  }
  console.log(`  ✓ ${predCount} predicciones`);

  // Clasificación (snapshots) a partir de predicciones puntuadas.
  const finishedMatchIds = new Set(
    matches.filter((m) => m.status === "FINISHED").map((m) => m.id),
  );
  const finishedByKickoff = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  const aggregates = [];
  for (const user of users) {
    const preds = await prisma.prediction.findMany({
      where: { userId: user.id },
    });
    const finished = preds.filter((p) => finishedMatchIds.has(p.matchId));
    const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactCount = finished.filter((p) => p.points === 3).length;
    const correctCount = finished.filter((p) => p.points === 1).length;
    const predictionsCount = finished.length;
    const accuracy =
      predictionsCount > 0
        ? Math.round(((exactCount + correctCount) / predictionsCount) * 1000) / 10
        : 0;

    // Rachas (sobre partidos terminados ordenados por kickoff).
    let bestStreak = 0;
    let currentStreak = 0;
    const byMatch = new Map(finished.map((p) => [p.matchId, p]));
    for (const m of finishedByKickoff) {
      const p = byMatch.get(m.id);
      if (p && (p.points ?? 0) > 0) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    aggregates.push({
      user,
      totalPoints,
      predictionsCount,
      exactCount,
      correctCount,
      accuracy,
      currentStreak,
      bestStreak,
    });
  }

  aggregates.sort((a, b) => b.totalPoints - a.totalPoints || b.accuracy - a.accuracy);
  for (let i = 0; i < aggregates.length; i++) {
    const a = aggregates[i];
    await prisma.leaderboardSnapshot.create({
      data: {
        userId: a.user.id,
        totalPoints: a.totalPoints,
        predictionsCount: a.predictionsCount,
        exactCount: a.exactCount,
        correctCount: a.correctCount,
        accuracy: a.accuracy,
        currentStreak: a.currentStreak,
        bestStreak: a.bestStreak,
        rank: i + 1,
        previousRank: Math.min(
          aggregates.length,
          Math.max(1, i + 1 + (Math.floor(mulberry32(hash(7, i + 1))() * 7) - 3)),
        ),
      },
    });

    // Logros derivados.
    const achievements: AchievementType[] = [];
    if (a.exactCount >= 1) achievements.push(AchievementType.PERFECT_SCORE);
    if (a.bestStreak >= 3) achievements.push(AchievementType.STREAK_3);
    if (a.bestStreak >= 5) achievements.push(AchievementType.STREAK_5);
    if (a.bestStreak >= 10) achievements.push(AchievementType.STREAK_10);
    if (i < 3) achievements.push(AchievementType.TOP_3);
    if (i < 10) achievements.push(AchievementType.TOP_10);
    for (const type of achievements) {
      await prisma.achievement.create({
        data: { userId: a.user.id, type },
      });
    }
  }
  console.log(`  ✓ clasificación y logros`);

  // Mini-liga.
  const league = await prisma.miniLeague.create({
    data: {
      name: "Liga de Amigos",
      inviteCode: "MUND26",
      createdById: users[0].id,
    },
  });
  for (const user of users.slice(0, 5)) {
    await prisma.miniLeagueMember.create({
      data: { userId: user.id, miniLeagueId: league.id },
    });
  }
  console.log(`  ✓ mini-liga "Liga de Amigos" (código: MUND26)`);

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
