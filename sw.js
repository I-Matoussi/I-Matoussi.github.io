/* Offline support for i-matoussi.github.io
   - The page, data and the PDF reader library are saved when the app is installed.
   - Every booklet listed in data.js is saved too, so it can be read offline
     even if the student never opened it while online. New booklets are saved
     the next time the student opens the site with internet. */
var VERSION = "im-v2";
var SHELL = ["./", "index.html", "data.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
var LIBS = [PDFJS + "pdf.min.js", PDFJS + "pdf.worker.min.js"];
var CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|upload\.wikimedia\.org)$/;

function saveLibs(c){
  return Promise.all(LIBS.map(function(u){
    return c.match(u).then(function(hit){
      if (hit) return;
      return fetch(u, {mode: "no-cors"}).then(function(r){ return c.put(u, r); }).catch(function(){});
    });
  }));
}
/* Read the list of PDFs from data.js and save any that are not saved yet. */
function savePdfs(c, dataText){
  var files = {}, re = /["']?file["']?\s*:\s*["']([^"']+\.pdf)["']/gi, m;
  while ((m = re.exec(dataText))) files[new URL(encodeURI(m[1]), self.registration.scope).href] = 1;
  return Promise.all(Object.keys(files).map(function(u){
    return c.match(u).then(function(hit){
      if (hit) return;
      return fetch(u).then(function(r){ if (r.ok) return c.put(u, r); }).catch(function(){});
    });
  }));
}
function saveAll(){
  return caches.open(VERSION).then(function(c){
    return saveLibs(c).then(function(){
      return fetch("data.js", {cache: "no-store"}).then(function(r){ return r.text(); })
        .then(function(t){ return savePdfs(c, t); }).catch(function(){});
    });
  });
}

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); })
    .then(saveAll).then(function(){ return self.skipWaiting(); }));
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
/* Page and data: try the network first, so students see updates at once. */
function networkFirst(req, after){
  return fetch(req).then(function(res){
    put(req, res);
    if (after && res.ok) res.clone().text().then(after).catch(function(){});
    return res;
  }).catch(function(){
    return caches.match(req, {ignoreSearch: true}).then(function(r){ return r || caches.match("index.html"); });
  });
}
/* PDFs, fonts, libraries, images: serve the saved copy at once, refresh it in the background. */
function staleWhileRevalidate(req){
  return caches.match(req, {ignoreVary: true}).then(function(hit){
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
      var whole = new Request(url.origin + url.pathname, {credentials: "same-origin"});   // ignore Range headers and ?query: one full copy per booklet
      e.respondWith(staleWhileRevalidate(whole));
    } else if (/\/data\.js$/i.test(url.pathname)) {
      e.respondWith(networkFirst(req, function(t){ caches.open(VERSION).then(function(c){ return saveLibs(c).then(function(){ return savePdfs(c, t); }); }); }));
    } else if (req.mode === "navigate" || /\.(html|js|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/")) {
      e.respondWith(networkFirst(req));
    } else {
      e.respondWith(staleWhileRevalidate(req));
    }
  } else if (CDN.test(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
