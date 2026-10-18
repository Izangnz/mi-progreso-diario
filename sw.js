/* Cambiar VERSION en cada publicación que modifique archivos de la aplicación.
   Mantener este archivo en la misma dirección. Nunca guarda datos personales. */
const VERSION = "0.10.1";
const CACHE_PREFIX = `mi-progreso-diario:${self.registration.scope}:`;
const CACHE_NAME = CACHE_PREFIX + VERSION;
const FILES = [
  "./", "./index.html", "./mi_progreso_diario.html", "./pwa.js",
  "./aprendizaje.js", "./aprendizaje.css",
  "./aprendizaje-contenido.js", "./aprendizaje-storage.js",
  "./aprendizaje-progreso.js",
  "./aprendizaje-preferencias.js",
  "./misiones-contenido.js", "./misiones-storage.js", "./misiones.js",
  "./manifest.webmanifest", "./icons/apple-touch-icon.png",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
];
const urls = FILES.map(path => new URL(path, self.registration.scope).href);

self.addEventListener("install", event => {
  // Si falta un archivo, la instalación falla y la versión anterior sigue activa.
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    cache.addAll(urls.map(url => new Request(url, {cache:"reload"})))
  ));
  // Las actualizaciones esperan a que el usuario pulse «Actualizar».
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "APPLY_UPDATE") return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const appWindows = windows.filter(client => client.url.startsWith(self.registration.scope));
    if (appWindows.length > 1) {
      event.source?.postMessage({type:"UPDATE_BLOCKED"});
      return;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Solo los archivos de la aplicación. No intercepta otros proyectos ni servicios.
  url.search = "";
  url.hash = "";
  if (!urls.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(url.href) || fetch(event.request);
  })());
});
