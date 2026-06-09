import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quiniela · Mundial 2026",
    short_name: "Quiniela",
    description:
      "Predice los 64 partidos del Mundial 2026 y compite con tus amigos.",
    lang: "es",
    start_url: "/partidos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07090F",
    theme_color: "#07090F",
    categories: ["sports", "games"],
    // Accesos rápidos al mantener pulsado el icono (Android/desktop).
    shortcuts: [
      {
        name: "Hacer predicciones",
        short_name: "Predecir",
        url: "/predicciones",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Partidos en directo",
        short_name: "Partidos",
        url: "/partidos",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Clasificación",
        short_name: "Tabla",
        url: "/clasificacion",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
