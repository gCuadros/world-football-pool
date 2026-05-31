import { ComingSoon } from "@/components/app/coming-soon";

export const dynamic = "force-dynamic";

export default function NotificacionesPage() {
  return (
    <ComingSoon
      phase="Fase 3"
      title="Notificaciones"
      description="Avisos 1 hora y 15 minutos antes de cada partido y resumen de los puntos obtenidos cuando finaliza."
    />
  );
}
