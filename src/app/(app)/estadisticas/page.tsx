import { ComingSoon } from "@/components/app/coming-soon";

export const dynamic = "force-dynamic";

export default function EstadisticasPage() {
  return (
    <ComingSoon
      phase="Fase 3"
      title="Estadísticas"
      description="Tu precisión por fase, evolución de puntos, mejores y peores predicciones y comparativa con la media."
    />
  );
}
