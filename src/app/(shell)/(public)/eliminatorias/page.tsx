import { redirect } from "next/navigation";

// Las eliminatorias ahora son una pestaña dentro de /mundial (cuadro + grupos
// + goleadores en una sola pantalla, sin saltar a páginas sueltas sin retorno).
export default function EliminatoriasPage() {
  redirect("/mundial?tab=eliminatorias");
}
