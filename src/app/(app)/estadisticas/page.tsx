import { redirect } from "next/navigation";

// Las estadísticas son ahora por liga dentro de /liga/[id].
export default function EstadisticasPage() {
  redirect("/ligas");
}
