/* Service worker : rend l'application utilisable hors connexion.
   Changez CACHE a chaque mise a jour du contenu pour forcer le rafraichissement. */
const CACHE = "mctb-quiz-v11";
const BASE = [
  "./", "./index.html", "./questionnaires.json", "./manifest.json",
  "./icone-192.png", "./icone-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(l => Promise.all(l.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Le code ET les donnees passent par le reseau d'abord, avec repli sur le
  // cache hors connexion. Sans cela, un index.html servi depuis le cache peut
  // se retrouver associe a un questionnaires.json plus recent : le code ne
  // connait alors pas toutes les options et l'affichage casse.
  const estPage = e.request.mode === "navigate"
               || url.pathname.endsWith("/")
               || url.pathname.endsWith(".html");
  if (estPage || url.pathname.endsWith("questionnaires.json")) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Le reste : le cache d'abord, puis le reseau.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && url.origin === location.origin) {
        const c = r.clone();
        caches.open(CACHE).then(x => x.put(e.request, c));
      }
      return r;
    }))
  );
});
