/* ============================================================
   Sparks Líder – Service Worker
   Estratégia: Cache-First / Offline-First
   ============================================================ */

const CACHE_NAME = 'sparks-lider-v1';

/* Arquivos que serão cacheados na instalação */
const STATIC_ASSETS = [
  '.',
  './index.html',
  './style.css',
  './app.js',
  './data/frases.json',
  './manifest.json',
  './config/theme.json',
  './config/app.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ── Instalação: pré-cache dos arquivos estáticos ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  /* Força ativação imediata sem esperar a aba fechar */
  self.skipWaiting();
});

/* ── Ativação: remove caches antigos ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/* ── Fetch: Cache-First, fallback para rede ── */
self.addEventListener('fetch', (event) => {
  /* Ignora requisições que não sejam GET */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      /* Tenta buscar na rede e cacheia a resposta */
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          /* Fallback: retorna index.html para navegação offline */
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
