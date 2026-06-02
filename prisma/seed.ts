import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import { importFromActiveProvider } from "../src/lib/import-fixtures";

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
  await prisma.prediction.deleteMany();
  await prisma.miniLeagueMember.deleteMany();
  await prisma.miniLeague.deleteMany();
  await prisma.match.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Calendario real del Mundial 2026.
  const result = await importFromActiveProvider();
  console.log(
    `  ✓ ${result.imported} partidos importados (proveedor: ${result.provider})`,
  );

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

  // Liga principal de demo — todos los usuarios.
  const mainLeague = await prisma.miniLeague.create({
    data: {
      name: "Liga de Amigos",
      inviteCode: "MUND26",
      createdById: users[0].id,
      members: {
        create: users.map((u) => ({ userId: u.id })),
      },
    },
  });
  console.log(`  ✓ Liga "Liga de Amigos" (código: MUND26)`);

  // Segunda liga demo — solo 4 usuarios.
  const secondLeague = await prisma.miniLeague.create({
    data: {
      name: "Liga Élite",
      inviteCode: "ELITE6",
      createdById: users[1].id,
      members: {
        create: users.slice(0, 4).map((u) => ({ userId: u.id })),
      },
    },
  });
  console.log(`  ✓ Liga "Liga Élite" (código: ELITE6)`);

  // Predicciones demo sobre los primeros partidos de la fase de grupos.
  const groupMatches = await prisma.match.findMany({
    where: { stage: "GROUP_STAGE" },
    orderBy: { matchNo: "asc" },
  });

  let predCount = 0;

  // Predicciones en la liga principal.
  for (let ui = 0; ui < users.length; ui++) {
    const take = ui === 0 ? 36 : 18 + Math.floor(mulberry32(hash(ui))() * 10);
    for (const m of groupMatches.slice(0, take)) {
      const rnd = mulberry32(hash(ui + 1, m.matchNo));
      await prisma.prediction.create({
        data: {
          userId: users[ui].id,
          leagueId: mainLeague.id,
          matchId: m.id,
          homeScore: Math.floor(rnd() * 4),
          awayScore: Math.floor(rnd() * 3),
          points: null,
        },
      });
      predCount++;
    }
  }

  // Predicciones en la liga élite (primeros 4 usuarios, marcadores distintos).
  for (let ui = 0; ui < 4; ui++) {
    const take = 20 + Math.floor(mulberry32(hash(ui + 10))() * 8);
    for (const m of groupMatches.slice(0, take)) {
      const rnd = mulberry32(hash(ui + 20, m.matchNo));
      await prisma.prediction.create({
        data: {
          userId: users[ui].id,
          leagueId: secondLeague.id,
          matchId: m.id,
          homeScore: Math.floor(rnd() * 3),
          awayScore: Math.floor(rnd() * 3),
          points: null,
        },
      });
      predCount++;
    }
  }

  console.log(`  ✓ ${predCount} predicciones demo (2 ligas)`);
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
