/**
 * Service Worker for Home Temperature Monitor PWA
 * Handles caching, offline support, and push notifications
 */

const CACHE_NAME = 'temp-monitor-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/charts.js',
    './manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Always fetch API requests from network (check for /api/ anywhere in path)
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        error: 'Offline',
                        message: 'Unable to connect to server'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        // Clone and cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    });
            })
    );
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {
        title: 'Temperature Alert',
        body: 'Check your home temperatures',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag: 'temp-alert',
        requireInteraction: true
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        requireInteraction: data.requireInteraction,
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'view', title: 'View Dashboard' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow('./');
                }
            })
    );
});

// Background sync for checking temperatures
self.addEventListener('sync', (event) => {
    if (event.tag === 'check-temps') {
        event.waitUntil(checkTemperatures());
    }
});

// Periodic background sync (when supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-temps-periodic') {
        event.waitUntil(checkTemperatures());
    }
});

// Check temperatures and send notifications if thresholds exceeded
async function checkTemperatures() {
    try {
        const response = await fetch('../api/sensors.php');
        const data = await response.json();

        if (data.alerts && data.alerts.length > 0) {
            // Send notification for each alert
            for (const alert of data.alerts) {
                await self.registration.showNotification('Temperature Alert', {
                    body: alert.message,
                    icon: './icons/icon-192.png',
                    badge: './icons/icon-72.png',
                    tag: `alert-${alert.sensor_id}`,
                    requireInteraction: true,
                    vibrate: [200, 100, 200],
                    data: { sensorId: alert.sensor_id }
                });
            }
        }
    } catch (error) {
        console.error('[SW] Error checking temperatures:', error);
    }
}
