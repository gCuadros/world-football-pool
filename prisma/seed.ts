import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { importFixtures } from "../src/lib/import-fixtures";
import { openfootballProvider } from "../src/lib/providers/openfootball";
import { rebuildLeaderboardAndAchievements } from "../src/lib/recalculate";

// Pseudo-aleatorio determinista para predicciones demo estables.
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

const DEMO_USERS = [
  { email: "gonzalo@quiniela.app", name: "Gonzalo Cuadros" },
  { email: "lucia@quiniela.app", name: "Lucía Fernández" },
  { email: "marco@quiniela.app", name: "Marco Rossi" },
  { email: "aisha@quiniela.app", name: "Aisha Khan" },
  { email: "diego@quiniela.app", name: "Diego Martín" },
  { email: "sara@quiniela.app", name: "Sara López" },
  { email: "kenji@quiniela.app", name: "Kenji Tanaka" },
  { email: "nora@quiniela.app", name: "Nora Becker" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function main() {
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

  // Calendario real del Mundial 2026 (openfootball).
  const result = await importFixtures(openfootballProvider);
  console.log(`  ✓ ${result.imported} partidos reales importados`);

  // Usuarios demo.
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [];
  for (const u of DEMO_USERS) {
    users.push(
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash,
          avatar: initials(u.name),
        },
      }),
    );
  }
  console.log(`  ✓ ${users.length} usuarios (contraseña: password123)`);

  // Predicciones demo sobre los primeros partidos de la fase de grupos.
  const groupMatches = await prisma.match.findMany({
    where: { stage: "GROUP_STAGE" },
    orderBy: { matchNo: "asc" },
  });

  let predCount = 0;
  for (let ui = 0; ui < users.length; ui++) {
    const take = ui === 0 ? 36 : 18 + Math.floor(mulberry32(hash(ui))() * 10);
    for (const m of groupMatches.slice(0, take)) {
      const rnd = mulberry32(hash(ui + 1, m.matchNo));
      await prisma.prediction.create({
        data: {
          userId: users[ui].id,
          matchId: m.id,
          homeScore: Math.floor(rnd() * 4),
          awayScore: Math.floor(rnd() * 3),
          points: null, // el torneo aún no ha empezado
        },
      });
      predCount++;
    }
  }
  console.log(`  ✓ ${predCount} predicciones demo`);

  // Clasificación inicial (todos a 0; se recalcula al haber resultados).
  await rebuildLeaderboardAndAchievements();
  console.log(`  ✓ clasificación inicializada`);

  // Mini-liga demo.
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
