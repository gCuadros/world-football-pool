import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getMatchesBase } from "@/lib/queries";
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
    matches = await getMatchesBase();
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

  for (const m of matches) {
    const vs = `${m.homeTeam} vs ${m.awayTeam}`;
    if (m.status === "LIVE") {
      live.push({
        id: `${m.id}-live`,
        kind: "live",
        title: `En directo: ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}`,
        detail: "Partido en curso",
        iso: m.kickoffAt,
      });
    } else if (m.status === "UPCOMING") {
      reminders.push({
        id: `${m.id}-rem`,
        kind: "reminder",
        title: `Próximo: ${vs}`,
        detail: "Recuerda hacer tu predicción antes del pitido inicial",
        iso: m.kickoffAt,
      });
    }
  }

  reminders.sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
  const notifs = [...live, ...reminders.slice(0, 8)];

  return <NotificacionesView notifs={notifs} />;
}
