/* The Golden Dinar: offline support.
   The game page is always fetched fresh when online (so updates appear at once)
   and saved for offline play. Fonts and Wikimedia photos are saved after first view. */
var VERSION = "golden-dinar-v1";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
var CDN = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|commons\.wikimedia\.org|upload\.wikimedia\.org)$/;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("golden-dinar") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function store(req, res) {
  if (res && (res.ok || res.type === "opaque")) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (res) { return store(req, res); })
      .catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match("index.html"); }); }));
  } else if (CDN.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return store(req, res); });
    }));
  }
});
