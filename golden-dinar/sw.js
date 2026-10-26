var V="gd-v1",F=["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(F)}).then(function(){return self.skipWaiting()}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==V&&x.indexOf("gd-")===0}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET")return;var u=new URL(r.url);if(u.origin!==location.origin)return;
e.respondWith(fetch(r,{cache:"no-cache"}).then(function(res){if(res.ok){var c=res.clone();caches.open(V).then(function(x){x.put(r,c)})}return res}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(h){return h||caches.match("index.html")})}))});
