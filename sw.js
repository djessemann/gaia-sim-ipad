// GAIA service worker — offline app-shell caching so the sim installs and runs
// with no network. Bump CACHE when shipping new assets.

const CACHE = 'gaia-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/font.css',
  './js/icons.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/config.js',
  './js/rng.js',
  './js/world.js',
  './js/simulation.js',
  './js/atmosphere.js',
  './js/biosphere.js',
  './js/geosphere.js',
  './js/civilization.js',
  './js/tools.js',
  './js/scenarios.js',
  './js/render.js',
  './js/input.js',
  './js/ui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for our own assets; network fallback otherwise.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
