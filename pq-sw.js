/* Service worker for Dr. Phil's Pharmacy Quest. It only handles its own files, so other pages on the site are untouched. */
const CACHE = "pq-v6";
const FILES = ["dr-phil-quest.html", "pq-manifest.webmanifest", "pq-icon-192.png", "pq-icon-512.png"];
const OWN = FILES.map(f => new URL(f, self.location).pathname);
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("pq-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin === location.origin && !OWN.includes(u.pathname)) return;
  if (u.origin !== location.origin && !fonts) return;
  e.respondWith(
    fetch(e.request).then(r => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
