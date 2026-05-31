import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMatchesView, getUserStatsView } from "@/lib/queries";
import { PartidosView } from "@/components/matches/partidos-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partidos" };

export default async function PartidosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let matches;
  let stats;
  try {
    [matches, stats] = await Promise.all([
      getMatchesView(user.id),
      getUserStatsView(user.id),
    ]);
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          La interfaz funciona, pero no se pudo cargar la base de datos. Revisa tu
          conexión con Supabase en <code className="font-mono">.env</code> y
          ejecuta el seed. Consulta <code className="font-mono">SETUP.md</code>.
        </p>
      </div>
    );
  }

  return <PartidosView matches={matches} stats={stats} />;
}
