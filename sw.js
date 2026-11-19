/* Candidata Cloud. El worker almacena solo recursos de la aplicación. */
const VERSION = "0.21.0";
const CACHE_PREFIX = `mi-progreso-diario:${self.registration.scope}:`;
const CACHE_NAME = CACHE_PREFIX + VERSION;
const FILES = [
  "./supabase-sdk-2.49.1.js", "./supabase-config.public.js",
  "./cloud-release.js", "./habit-transport.js", "./sync-engine.js",
  "./welcome.js", "./legacy-access.js",
  "./habit-sync.js", "./user-storage.js", "./migration-ui.js", "./domain-transfer.js", "./transfer-crypto.js",
  "./account.js", "./account.css", "./pwa.js",
  "./perfil-datos.js", "./perfil.css", "./perfil-foto.js", "./perfil.js",
  "./descubrir.js", "./comunidad.css", "./comunidad-datos.js", "./comunidad.js",
  "./manifest.webmanifest", "./icons/apple-touch-icon.png",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"
];
const urls = FILES.map(path => new URL(path, self.registration.scope).href);

const pageURL = new URL("./mi_progreso_diario.html", self.registration.scope).href;
const htmlAlias = pageURL.slice(0, -5);
const navigationURLs = new Set([
  pageURL, htmlAlias, self.registration.scope, new URL("./index.html", self.registration.scope).href
]);

async function cachePage(cache) {
  const response = await fetch(pageURL, {cache:"reload", redirect:"follow"});
  if (!response.ok || ![pageURL, htmlAlias].includes(response.url) ||
      !/^text\/html\b/i.test(response.headers.get("Content-Type") || "")) {
    throw new Error("No se pudo preparar el documento de la aplicación");
  }
  // Fetch sigue las redirecciones de Sites. CacheStorage conservaría
  // redirected=true y WebKit rechazaría esa respuesta al recargar.
  const headers = new Headers(response.headers);
  for (const name of ["Content-Encoding", "Content-Length", "Location"]) headers.delete(name);
  await cache.put(pageURL, new Response(response.body, {status:response.status, headers}));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all([
      cachePage(cache),
      cache.addAll(urls.map(url => new Request(url, {cache:"reload", redirect:"error"})))
    ]);
  })());
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
  url.search = "";
  url.hash = "";
  const cacheKey = event.request.mode === "navigate" && navigationURLs.has(url.href)
    ? pageURL : url.href;
  if (cacheKey !== pageURL && !urls.includes(cacheKey)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey);
    if (cached?.ok && !cached.redirected) return cached;
    return fetch(event.request);
  })());
});
