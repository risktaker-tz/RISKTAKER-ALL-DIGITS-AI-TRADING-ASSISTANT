self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("tuchati-shell-v1").then((cache) =>
      cache.addAll(["/en", "/en/feed", "/icon.svg"])
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open("tuchati-runtime-v1").then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/en/feed"));
    })
  );
});
