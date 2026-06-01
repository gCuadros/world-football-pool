import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMatchesView } from "@/lib/queries";
import {
  NotificacionesView,
  type Notif,
} from "@/components/notifications/notificaciones-view";
import Loading from "./loading";

export const metadata = { title: "Notificaciones" };

export default function NotificacionesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NotificacionesContent />
    </Suspense>
  );
}

async function NotificacionesContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let matches;
  try {
    matches = await getMatchesView(user.id);
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          No se pudieron cargar tus notificaciones. Revisa Supabase en{" "}
          <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  const live: Notif[] = [];
  const reminders: Notif[] = [];
  const results: Notif[] = [];

  for (const m of matches) {
    const vs = `${m.homeTeam} vs ${m.awayTeam}`;
    if (m.status === "LIVE" && m.prediction) {
      live.push({
        id: `${m.id}-live`,
        kind: "live",
        title: `En directo: ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}`,
        detail: `Tu predicción: ${m.prediction.homeScore}-${m.prediction.awayScore}`,
        iso: m.kickoffAt,
      });
    } else if (m.status === "FINISHED" && m.prediction) {
      const pts = m.prediction.points ?? 0;
      results.push({
        id: `${m.id}-res`,
        kind: "result",
        title: `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`,
        detail: pts > 0 ? `Conseguiste ${pts} ${pts === 1 ? "punto" : "puntos"}` : "Sin puntos esta vez",
        iso: m.kickoffAt,
        points: pts,
      });
    } else if (m.status === "UPCOMING" && !m.locked && !m.prediction) {
      reminders.push({
        id: `${m.id}-rem`,
        kind: "reminder",
        title: `Predice ${vs}`,
        detail: "Aún no has hecho tu predicción",
        iso: m.kickoffAt,
      });
    }
  }

  reminders.sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
  results.sort((a, b) => +new Date(b.iso) - +new Date(a.iso));

  const notifs = [...live, ...reminders.slice(0, 8), ...results.slice(0, 12)];

  return <NotificacionesView notifs={notifs} />;
}
