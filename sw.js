/* Offline support for i-matoussi.github.io */
var VERSION = "im-v1";
var SHELL = ["./", "index.html", "data.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
var CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|upload\.wikimedia\.org)$/;

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function put(req, res){
  if (res && (res.ok || res.type === "opaque")) { var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
  return res;
}
/* Page and data: always try the network first, so students see updates at once. */
function networkFirst(req){
  return fetch(req).then(function(res){ return put(req, res); })
    .catch(function(){ return caches.match(req, {ignoreSearch:true}).then(function(r){ return r || caches.match("index.html"); }); });
}
/* PDFs, fonts, libraries, images: serve the saved copy at once, refresh it in the background. */
function staleWhileRevalidate(req){
  return caches.match(req).then(function(hit){
    var net = fetch(req).then(function(res){ return put(req, res); }).catch(function(){ return hit; });
    return hit || net;
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    if (/\.pdf$/i.test(url.pathname)) {
      var whole = new Request(url.href, {credentials: "same-origin"});   // ignore Range headers: cache the full booklet
      e.respondWith(staleWhileRevalidate(whole));
    } else if (req.mode === "navigate" || /\.(html|js|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/")) {
      e.respondWith(networkFirst(req));
    } else {
      e.respondWith(staleWhileRevalidate(req));
    }
  } else if (CDN.test(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
