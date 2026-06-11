// Service worker de la Quiniela Mundial 2026.
// 1. Web Push (recepción + clic en notificación).
// 2. Soporte offline: precache de la página offline, cache-first para los
//    assets inmutables de Next, stale-while-revalidate para imágenes y
//    network-first con fallback a /offline.html para navegaciones.
//
// ⚠️ NO se cachean páginas HTML: servir HTML de un deploy anterior referencia
// chunks que ya no existen en el servidor → "module factory not available" →
// crash en bucle de la PWA ("ha generado problemas repetidamente" en iOS).
// Offline se degrada a la página de cortesía, nunca a una página rancia.
//
// ⚠️ Sube VERSION en cada cambio de este archivo: dispara el flujo de
// actualización (toast "Nueva versión disponible" en sw-register).

const VERSION = "quiniela-v2";
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;

const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/apple-icon-180.png"];

self.addEventListener("install", (event) => {
  // skipWaiting inmediato: las PWAs con la v1 rota (HTML rancio cacheado)
  // crashean antes de poder pulsar el toast de actualización — la v2 debe
  // tomar control y purgar cachés sin esperar interacción. Sin PAGE_CACHE
  // ya no hay riesgo de mezclar versiones a mitad de sesión.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// El cliente (sw-register) pide activar la versión nueva tras confirmar el
// usuario en el toast de actualización.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Datos y auth siempre a red (nunca servir respuestas de API cacheadas).
  if (url.pathname.startsWith("/api/")) return;
  // Las peticiones RSC de navegación cliente llevan estado de sesión: a red.
  if (url.searchParams.has("_rsc")) return;

  // Navegaciones: siempre a red (HTML fresco = chunks vivos del deploy
  // actual); sin red, la página offline de cortesía. Nunca HTML cacheado.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return caches.match(OFFLINE_URL);
        }
      })(),
    );
    return;
  }

  // Assets con hash de Next (inmutables solo en producción): cache-first.
  // En dev (localhost) Turbopack reutiliza nombres con contenido distinto —
  // cachearlos congela CSS/JS rancios; se dejan pasar a red.
  if (
    url.pathname.startsWith("/_next/static/") &&
    self.location.hostname !== "localhost"
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  // Imágenes (escudos, avatares, iconos): stale-while-revalidate.
  if (
    request.destination === "image" ||
    url.pathname.startsWith("/_next/image")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Quiniela Mundial 2026", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Quiniela Mundial 2026";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { link: data.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(link);
      }),
  );
});
