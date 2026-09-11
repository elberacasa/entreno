/* The build injects the asset list. Installation succeeds only when all
 * essential files are cached, including those fetched before SW control. */
const VERSION = '__BUILD_ID__';
const PRECACHE = /*__PRECACHE__*/ [];
const PREFIX = `entreno:${self.registration.scope}:`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.length ? PRECACHE : [SHELL])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(SHELL) || url.pathname.endsWith('/sw.js')) return;
  if (request.mode === 'navigate') {
    // HTML and its versioned assets are upgraded together by the next worker.
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(SHELL)) ?? fetch(request)));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(request)) ?? fetch(request)));
});
