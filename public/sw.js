// Service worker mínimo: hace la app instalable y muestra una página sin conexión.
// No cachea datos personales: las páginas y la API siempre van a la red.
const OFFLINE_HTML = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><body style="font-family:system-ui;padding:2rem;background:#111113;color:#ececef"><h1>Sin conexión</h1><p>Vuelve a intentarlo cuando tengas internet.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
