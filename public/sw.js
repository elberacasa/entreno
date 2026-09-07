/* Service worker de Entreno: deja la app usable sin conexión. */

const VERSION = 'v1';
const CACHE = `entreno-${VERSION}`;

/**
 * El scope lo fija el registro (`/entreno/` en GitHub Pages, `/` en local),
 * así que el shell se deduce solo y no hay rutas escritas a mano.
 */
const SHELL = () => self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL()))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // El propio worker nunca se cachea: si no, quedaría anclado a esta versión.
  if (url.pathname.endsWith('/sw.js')) return;

  // Navegaciones: primero la red, para coger la última versión publicada.
  // Sin conexión servimos el shell cacheado; la app enruta por su cuenta.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL(), copy));
          return response;
        })
        .catch(() => caches.match(SHELL()).then((hit) => hit ?? caches.match(request))),
    );
    return;
  }

  // Estáticos: primero la caché. Los nombres llevan hash, así que una versión
  // nueva trae rutas nuevas y no hace falta invalidar nada a mano.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
