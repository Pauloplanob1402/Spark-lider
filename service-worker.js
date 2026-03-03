/* Sparks Líder – Service Worker - Versão v20 */
const CACHE_NAME = 'sparks-lider-v20'; 

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      });
    })
  );
});
