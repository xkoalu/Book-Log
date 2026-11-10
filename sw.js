/* BOOK.LOG service worker: documents network-first, own files cache-first, cover images cached for offline use. */
var CACHE = 'booklog-v0.2.1';
var IMG_CACHE = 'booklog-img';
var CORE = ['./', './index.html', './manifest.json?v=1', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE && k !== IMG_CACHE) return caches['delete'](k); return null; }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  })['catch'](function () {
    return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
  });
}

function cacheFirst(req, name) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(name).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(networkFirst(req));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, CACHE));
    return;
  }
  if (req.destination === 'image' && /covers\.openlibrary\.org|archive\.org|books\.google|googleusercontent/.test(url.hostname)) {
    e.respondWith(cacheFirst(req, IMG_CACHE));
  }
});
