import { ComingSoon } from "@/components/app/coming-soon";

export const dynamic = "force-dynamic";

export default function MiniLigasPage() {
  return (
    <ComingSoon
      phase="Fase 3"
      title="Mini-ligas"
      description="Crea ligas privadas, invita con un código de 6 caracteres y compite en una clasificación solo entre tu grupo."
    />
  );
}
