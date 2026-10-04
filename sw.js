const CACHE_NAME = "recetapp-v7";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=7",
  "./app.js",
  "./tema.js",
  "./catalogos.js",
  "./automatizar.js",
  "./frecuentes.js",
  "./sanitize.js",
  "./auth.js",
  "./marcas.js",
  "./recomendaciones.js",
  "./icon.svg",
  "./logo.svg",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    ).then(() => self.clients.claim())
  );
});

function isCodeRequest(url) {
  return /\.(css|js)$/.test(url.pathname);
}

function isDocumentRequest(request, url) {
  return request.mode === "navigate"
    || url.pathname === "/"
    || url.pathname.endsWith("/")
    || url.pathname.endsWith("index.html");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    return;
  }
  if (isCodeRequest(url) || isDocumentRequest(event.request, url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      });
    }).catch(() => caches.match("./index.html"))
  );
});
