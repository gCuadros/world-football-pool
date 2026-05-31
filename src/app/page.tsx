import { redirect } from "next/navigation";

// La raíz redirige a la app; el middleware envía a /login si no hay sesión.
export default function Home() {
  redirect("/partidos");
}
