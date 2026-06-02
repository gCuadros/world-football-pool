import { redirect } from "next/navigation";

// La clasificación ahora es por liga. Redirige a la lista de ligas del usuario.
export default function ClasificacionPage() {
  redirect("/ligas");
}
