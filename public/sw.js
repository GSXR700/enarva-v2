// public/sw.js - SERVICE WORKER FOR PWA & PUSH NOTIFICATIONS
const CACHE_NAME = 'enarva-os-v1.0';
const STATIC_CACHE = 'enarva-static-v1.0';
const DYNAMIC_CACHE = 'enarva-dynamic-v1.0';

// Essential static files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-icon.png',
  '/offline.html' // We'll create this fallback page
];

// Routes to cache dynamically
const CACHE_ROUTES = [
  '/dashboard',
  '/leads',
  '/quotes',
  '/clients',
  '/settings'
];

// INSTALLATION EVENT
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// ACTIVATION EVENT
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );
});

// FETCH EVENT - Network first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  }
});

async function handleGetRequest(request) {
  const url = new URL(request.url);
  
  // For static assets, try cache first
  if (isStaticAsset(url.pathname)) {
    return handleStaticAsset(request);
  }
  
  // For API routes, always go network first
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request);
  }
  
  // For pages, use network first with cache fallback
  return handlePageRequest(request);
}

function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2)$/) ||
         pathname === '/manifest.json' ||
         pathname.startsWith('/_next/static/');
}

async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Serve from cache and update in background
      fetch(request).then(response => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
      });
      return cachedResponse;
    }
    
    // Not in cache, fetch and cache
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
    
  } catch (error) {
    console.error('[SW] Error handling static asset:', error);
    return new Response('Asset not available', { status: 404 });
  }
}

async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] API request failed:', error);
    return new Response(
      JSON.stringify({ error: 'Network unavailable' }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handlePageRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache...');
    
    // Try cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Ultimate fallback
    return new Response(
      '<html><body><h1>Offline</h1><p>Cette page n\'est pas disponible hors ligne.</p></body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// PUSH NOTIFICATION HANDLING
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-72x72.png',
      tag: 'enarva-notification',
      requireInteraction: true,
      actions: data.actions || [],
      data: {
        url: data.url || '/',
        timestamp: Date.now()
      },
      vibrate: [100, 50, 100]
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Enarva OS', 
        options
      )
    );
    
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
  }
});

// NOTIFICATION CLICK HANDLING
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// SYNC EVENT (for background sync if needed)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('[SW] Performing background sync...');
}

// MESSAGE HANDLING (for communication with main thread)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});