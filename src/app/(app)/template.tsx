// Re-monta el contenido en cada navegación dentro de la zona privada → dispara
// la animación de entrada `.route-enter` (definida en globals.css; respeta
// prefers-reduced-motion). Sirve para suavizar la transición entre secciones.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
