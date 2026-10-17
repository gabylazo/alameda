// sw.js — para que la app abra sin conexión (en el súper sin cobertura): primero la red y, si no hay, lo guardado.
// Las fotos de Mercadona se guardan la primera vez que se ven.
const CACHE = 'alameda-v1', FOTOS = 'alameda-fotos';
const BASE = ['./', 'index.html', 'app.css', 'app.js', 'logica.js', 'manifest.webmanifest', 'iconos/icono-180.png', 'iconos/icono-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.hostname === 'prod-mercadona.imgix.net') {
    e.respondWith(caches.open(FOTOS).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
