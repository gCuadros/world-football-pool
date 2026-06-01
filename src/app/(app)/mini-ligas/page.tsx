import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMiniLeaguesForUser } from "@/lib/leaderboard";
import { FEATURES } from "@/lib/features";
import { MiniLeaguesView } from "@/components/leaderboard/mini-leagues-view";
import Loading from "./loading";

export const metadata = { title: "Mini-ligas" };

export default function MiniLigasPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MiniLigasContent />
    </Suspense>
  );
}

async function MiniLigasContent() {
  // Feature desactivada: la ruta no existe para el usuario → a la home.
  if (!FEATURES.miniLeagues) redirect("/partidos");

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
