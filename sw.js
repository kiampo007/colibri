/* ============================================
   COLIBRÍ BOBA TEA v4.2 - SERVICE WORKER ROBUSTO
   Cache | Offline | Sync | Push
   ============================================ */

const CACHE_NAME = 'colibri-boba-tea-v42';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './robustez.js',
    './manifest.json'
];

// Instalación
self.addEventListener('install', (event) => {
    console.log('🔧 SW instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.log('❌ Error cacheando:', err))
    );
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('🚀 SW activado');
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

// Fetch con estrategia Network First, luego Cache
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;
    if (request.url.startsWith('chrome-extension://')) return;

    // Para APIs y datos: Network First
    if (request.url.includes('api') || request.url.includes('indexedDB')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Para assets estáticos: Cache First
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Refrescar en background
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
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback para imágenes
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

// Background Sync para operaciones pendientes
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-sales') {
        event.waitUntil(syncPendingSales());
    }
});

async function syncPendingSales() {
    console.log('🔄 Sincronizando ventas pendientes...');
    // Las ventas se sincronizan automáticamente via localStorage
}

// Push notifications para alertas
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'Alerta de Colibrí Boba Tea',
        icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
        tag: data.tag || 'colibri-alert',
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Abrir App' },
            { action: 'dismiss', title: 'Descartar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('🌸 Colibrí Boba Tea', options)
    );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});
