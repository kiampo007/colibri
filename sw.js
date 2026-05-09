/* ============================================
   COLIBRÍ BOBA TEA v2.0 - SERVICE WORKER
   Cache | Offline | PWA
   ============================================ */

const CACHE_NAME = 'colibri-boba-tea-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json'
];

// Instalación
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalando...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Assets cacheados');
                return self.skipWaiting();
            })
            .catch(err => console.log('❌ Error cacheando:', err))
    );
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activado');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo cachear GET requests
    if (request.method !== 'GET') return;

    // Ignorar requests de Chrome extensions
    if (request.url.startsWith('chrome-extension://')) return;

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Refrescar cache en background
                    fetch(request)
                        .then(networkResponse => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(request, networkResponse.clone());
                                });
                            }
                        })
                        .catch(() => {});

                    return cachedResponse;
                }

                return fetch(request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // Cachear nuevos recursos estáticos
                        if (request.url.includes('.js') || request.url.includes('.css') || request.url.includes('.html')) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, responseClone);
                            });
                        }

                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback offline para imágenes
                        if (request.destination === 'image') {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="#1a1a2e" width="400" height="400"/><text fill="#00d4aa" font-family="Arial" font-size="60" x="50%" y="50%" text-anchor="middle" dy=".3em">🧋</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }

                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Sync (para operaciones en background)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-sales') {
        event.waitUntil(syncSales());
    }
});

async function syncSales() {
    console.log('🔄 Sincronizando ventas...');
}

// Push notifications (para recordatorios de deudas)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'Recordatorio de Colibrí Boba Tea',
        icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        tag: data.tag || 'colibri-notification',
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification('🌸 Colibrí Boba Tea', options)
    );
});
