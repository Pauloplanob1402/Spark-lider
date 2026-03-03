/* ============================================================
   Sparks Líder – Service Worker
   Versão: v100 (Limpeza Total e Forçar Atualização)
   ============================================================ */

const CACHE_NAME = 'sparks-lider-v100'; 

const STATIC_ASSETS = [
  './',
  './index.html',
  './estilo.css',      
  './app.js',
  './frases.json',     
  './manifest.json',
  './tema.json',       
  './app.json',        
  './ícone-192.png',   
  './ícone-512.png',
  './spks-logo-welcome.png',
  './spks-welcome.png'
];

/* ── Instalação: Limpa o que já existe e tenta cachear o novo ── */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => cache.add(asset))
      );
    })
  );
});

/* ── Ativação: Deleta ABSOLUTAMENTE todos os caches antigos ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/* ── Fetch: Network-First (Tenta internet primeiro para não dar erro nas frases) ── */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a internet funcionar, atualiza o cache e entrega o arquivo novo
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Se a internet falhar (offline), tenta buscar no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // Se for uma navegação de página e estiver offline, volta para o index
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
