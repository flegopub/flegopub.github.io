// Service Worker per Flègo - Strategia Network First
// Cache name con versione per facilitare aggiornamenti
const CACHE_NAME = 'flegopub-v1';
const RUNTIME_CACHE = 'flegopub-runtime-v1';

// File da mettere in cache all'installazione
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/home.html',
  '/style.css',
  '/manifest.json',
  '/logo.png',
  '/logomini.png',
  '/taglieri.html',
  '/panini.html',
  '/primi-secondi-contorni.html',
  '/piccoli-morsi.html',
  '/frittatine.html',
  '/birre.html',
  '/birre-altre-bevande.html',
  '/vini.html',
  '/cocktails.html',
  '/autore.html',
  '/policy.html',
  '/404.html'
];

// Installazione: precache dei file principali
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching file...');
        return cache.addAll(PRECACHE_FILES.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting()) // Attiva immediatamente il nuovo service worker
  );
});

// Attivazione: pulizia cache vecchie
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Rimozione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prendi controllo di tutte le pagine
  );
});

// Fetch: STRATEGIA NETWORK FIRST
self.addEventListener('fetch', (event) => {
  // Ignora richieste non GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora richieste a domini esterni (CDN, API, ecc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && 
      !url.href.includes('fonts.googleapis.com') &&
      !url.href.includes('fonts.gstatic.com') &&
      !url.href.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    // Prova prima la rete
    fetch(event.request)
      .then((response) => {
        // Se la rete funziona, clona e salva in cache
        const responseToCache = response.clone();
        
        // Salva solo risposte valide (status 200)
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Se la rete fallisce, prova la cache
        console.log('[Service Worker] Rete non disponibile, uso cache per:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se non c'è in cache, prova con la cache di precache
          return caches.match(event.request.url);
        });
      })
  );
});

