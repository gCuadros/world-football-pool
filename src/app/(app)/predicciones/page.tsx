import { ComingSoon } from "@/components/app/coming-soon";

export const dynamic = "force-dynamic";

export default function PrediccionesPage() {
  return (
    <ComingSoon
      phase="Fase 2"
      title="Mis Predicciones"
      description="Tus tarjetas de predicción en sus tres estados (abierta, cuenta regresiva y cerrada), con marcador editable, quick picks y distribución de la comunidad."
    />
  );
}
