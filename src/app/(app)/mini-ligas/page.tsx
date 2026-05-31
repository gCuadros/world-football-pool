import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMiniLeaguesForUser } from "@/lib/leaderboard";
import { MiniLeaguesView } from "@/components/leaderboard/mini-leagues-view";

export const dynamic = "force-dynamic";

export default async function MiniLigasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let leagues;
  try {
    leagues = await getMiniLeaguesForUser(user.id);
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          No se pudieron cargar tus mini-ligas. Revisa Supabase en{" "}
          <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  return <MiniLeaguesView leagues={leagues} />;
}
