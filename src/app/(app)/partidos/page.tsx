import { Radio, CalendarClock, CheckCircle2, Star } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Stats = {
  total: number;
  live: number;
  upcoming: number;
  finished: number;
  points: number;
  predictions: number;
  dbReady: boolean;
};

async function loadStats(userId: string): Promise<Stats> {
  try {
    const [total, live, upcoming, finished, snapshot] = await Promise.all([
      prisma.match.count(),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.match.count({ where: { status: "UPCOMING" } }),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.leaderboardSnapshot.findUnique({ where: { userId } }),
    ]);
    return {
      total,
      live,
      upcoming,
      finished,
      points: snapshot?.totalPoints ?? 0,
      predictions: snapshot?.predictionsCount ?? 0,
      dbReady: true,
    };
  } catch {
    return {
      total: 0,
      live: 0,
      upcoming: 0,
      finished: 0,
      points: 0,
      predictions: 0,
      dbReady: false,
    };
  }
}

export default async function PartidosPage() {
  const user = await getCurrentUser();
  const stats = user
    ? await loadStats(user.id)
    : {
        total: 0,
        live: 0,
        upcoming: 0,
        finished: 0,
        points: 0,
        predictions: 0,
        dbReady: false,
      };

  if (!stats.dbReady) {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          La interfaz funciona, pero aún no hay conexión con Supabase. Añade tus
          credenciales en <code className="font-mono">.env</code> y ejecuta las
          migraciones y el seed. Consulta{" "}
          <code className="font-mono">SETUP.md</code> para los pasos exactos.
        </p>
      </div>
    );
  }

  const cards = [
    { label: "En directo", value: stats.live, icon: Radio, tone: "text-live" },
    { label: "Próximos", value: stats.upcoming, icon: CalendarClock, tone: "text-primary" },
    { label: "Terminados", value: stats.finished, icon: CheckCircle2, tone: "text-success" },
    { label: "Mis puntos", value: stats.points, icon: Star, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {stats.live > 0 ? (
        <div className="border-live/30 bg-live/10 flex items-center gap-3 rounded-xl border px-4 py-3">
          <span className="relative flex size-2.5">
            <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-live relative inline-flex size-2.5 rounded-full" />
          </span>
          <span className="text-sm font-medium">
            {stats.live} {stats.live === 1 ? "partido" : "partidos"} en curso ahora
            mismo
          </span>
          <Badge variant="outline" className="border-live/40 text-live ml-auto font-mono">
            EN DIRECTO
          </Badge>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="border-border bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
                {label}
              </span>
              <Icon className={`size-4 ${tone}`} />
            </div>
            <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="border-border bg-card rounded-2xl border p-6">
        <div className="border-primary mb-4 border-l-2 pl-3">
          <h2 className="text-lg font-bold">Todo listo · Fase 1 completada</h2>
          <p className="text-muted-foreground text-sm">
            Autenticación, base de datos y los {stats.total} partidos del Mundial
            2026 están operativos.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          La cuadrícula de partidos en directo, los filtros por fase, las tarjetas
          de predicción con cuenta regresiva y la barra de estadísticas llegan en
          la <span className="text-foreground font-medium">Fase 2</span>. Tu
          sesión ya está conectada con {stats.predictions} predicciones sembradas.
        </p>
      </div>
    </div>
  );
}
