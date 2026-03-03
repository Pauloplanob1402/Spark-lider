/* ============================================================
   Sparks Líder – Service Worker
   Estratégia: Cache-First / Offline-First
   Versão Atualizada: v10 (Força atualização em todos os dispositivos)
   ============================================================ */

const CACHE_NAME = 'sparks-lider-v10'; // Aumentei para v10 para garantir limpeza total

/* Arquivos corrigidos para refletir a raiz do seu GitHub */
const STATIC_ASSETS = [
  './',
  './index.html',
  './estilo.css',      // Ajustado de style.css para estilo.css (conforme seu print)
  './app.js',
  './frases.json',     // Removido o /data/ - Agora ele encontra o arquivo!
  './manifest.json',
  './tema.json',       // Ajustado de config/theme para tema.json (conforme seu print)
  './app.json',        // Ajustado para a raiz
  './ícone-192.png',   // Ajustado os nomes com acento conforme seu print
  './ícone-512.png'
];

/* ── Instalação: pré-cache dos arquivos estáticos ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos um loop para evitar que um erro em um arquivo trave todo o cache
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => cache.add(asset))
      );
    })
  );
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
