import { redirect } from "next/navigation";

// Las mini-ligas son ahora el core bajo /ligas.
export default function MiniLigasPage() {
  redirect("/ligas");
}
