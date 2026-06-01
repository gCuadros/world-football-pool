import { apiFootballProvider } from "../src/lib/providers/api-football";

async function main() {
  const t = Date.now();
  const fx = await apiFootballProvider.getFixtures();
  console.log("total fixtures:", fx.length, "en", Date.now() - t, "ms");

  const byStage: Record<string, number> = {};
  fx.forEach((f) => (byStage[f.stage] = (byStage[f.stage] || 0) + 1));
  console.log("por fase:", JSON.stringify(byStage));

  const groups = [...new Set(fx.filter((f) => f.group).map((f) => f.group))].sort();
  console.log("grupos:", groups.join(",") || "(ninguno)");

  const s = fx[0];
  console.log(
    "ejemplo:",
    JSON.stringify({
      matchNo: s?.matchNo,
      ext: s?.externalId,
      h: s?.homeTeam,
      a: s?.awayTeam,
      crest: s?.homeCrest,
      grp: s?.group,
      kick: s?.kickoffAt,
      st: s?.status,
      stadium: s?.stadium,
    }),
  );

  const noFlag = [
    ...new Set(
      fx
        .flatMap((f) => [
          [f.homeTeam, f.homeFlag] as const,
          [f.awayTeam, f.awayFlag] as const,
        ])
        .filter(([, fl]) => fl === null)
        .map(([n]) => n),
    ),
  ];
  console.log("equipos SIN bandera ES (revisar alias):", JSON.stringify(noFlag));
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
