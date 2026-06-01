import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMatchesView, getUserStatsView } from "@/lib/queries";
import { PrediccionesView } from "@/components/predictions/predicciones-view";
import Loading from "./loading";

export const metadata = { title: "Mis Predicciones" };

export default function PrediccionesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PrediccionesContent />
    </Suspense>
  );
}

async function PrediccionesContent() {
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
          No se pudo cargar la base de datos. Revisa tu conexión con Supabase en{" "}
          <code className="font-mono">.env</code>. Consulta{" "}
          <code className="font-mono">SETUP.md</code>.
        </p>
      </div>
    );
  }

  return (
    <PrediccionesView
      matches={matches}
      stats={stats}
      userName={user.name}
      userInitials={user.initials}
    />
  );
}
