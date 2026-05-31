import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import {
  getLeaderboard,
  getRankInfo,
  getMiniLeaguesForUser,
  getUnlockedAchievements,
} from "@/lib/leaderboard";
import { RankBanner } from "@/components/leaderboard/rank-banner";
import { ClasificacionView } from "@/components/leaderboard/clasificacion-view";
import { AchievementsWidget } from "@/components/leaderboard/achievements-widget";

export const dynamic = "force-dynamic";

export default async function ClasificacionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let info, generalRows, miniLeagues, unlocked;
  try {
    [info, generalRows, miniLeagues, unlocked] = await Promise.all([
      getRankInfo(user.id),
      getLeaderboard(user.id),
      getMiniLeaguesForUser(user.id),
      getUnlockedAchievements(user.id),
    ]);
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          No se pudo cargar la clasificación. Revisa Supabase en{" "}
          <code className="font-mono">.env</code> y consulta{" "}
          <code className="font-mono">SETUP.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RankBanner info={info} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClasificacionView generalRows={generalRows} miniLeagues={miniLeagues} />
        </div>
        <aside className="lg:col-span-1">
          <AchievementsWidget unlocked={[...unlocked]} />
        </aside>
      </div>
    </div>
  );
}
