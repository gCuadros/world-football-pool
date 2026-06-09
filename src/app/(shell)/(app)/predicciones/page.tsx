import { redirect } from "next/navigation";

// Las predicciones ahora son por liga. Redirige a la lista de ligas.
export default function PrediccionesPage() {
  redirect("/ligas");
}
