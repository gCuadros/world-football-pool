import { redirect } from "next/navigation";

// Los partidos son ahora la zona pública /resultados.
export default function PartidosPage() {
  redirect("/resultados");
}
