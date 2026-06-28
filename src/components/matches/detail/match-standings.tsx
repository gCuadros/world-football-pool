import { getWorldCupStandings } from "@/lib/queries";
import { GroupTable } from "@/components/mundial/group-table";

export async function MatchStandingsSection({ group }: { group: string | null }) {
  if (!group) return null;
  const standings = await getWorldCupStandings();
  const groupStanding = standings.find((g) => g.group === group);
  if (!groupStanding) return null;

  return (
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-base font-bold">
        📊 Clasificación — Grupo {group}
      </h2>
      <GroupTable group={groupStanding} />
    </section>
  );
}
