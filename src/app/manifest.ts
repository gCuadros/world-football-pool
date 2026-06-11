import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` estable: permite renombrar start_url sin que el sistema trate la
    // app instalada como una distinta.
    id: "/",
    name: "Quiniela · Mundial 2026",
    short_name: "Quiniela",
    description:
      "Predice los 64 partidos del Mundial 2026 y compite con tus amigos.",
    lang: "es",
    // "/" directo: /partidos es un redirect de servidor a /resultados y cada
    // arranque en frío de la app instalada pagaba ese salto extra.
    start_url: "/",
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
        url: "/resultados",
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
