// Animación de entrada al navegar entre páginas públicas. Ver globals.css.
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
