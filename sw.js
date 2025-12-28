// Change this to your repository name
var GHPATH = '/PalmReaderApp';

// Choose a different app prefix name
var APP_PREFIX = 'palmreader_';

// The version of the cache. Every time you change any of the files
// you need to change this version (version_01, version_02…). 
// If you don't change the version, the service worker will give your
// users the old files!
var VERSION = 'version_04';

// The files to make available for offline use. make sure to add 
// others to this list
// Note: External CDN resources are not cached - they're fetched directly by the browser
var URLS = [    
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/manifest.json`,
  `${GHPATH}/icon.svg`
];

var CACHE_NAME = APP_PREFIX + VERSION;
var urlsToCache = URLS;

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  try {
    const url = event.request.url;
    
    // Skip external CDN, WASM, and chrome-extension requests - let browser handle directly
    if (url.includes('cdn.jsdelivr.net') || 
        url.includes('cdn.tailwindcss.com') || 
        url.includes('fonts.googleapis.com') ||
        url.includes('fonts.gstatic.com') ||
        url.includes('chrome-extension://') ||
        url.endsWith('.wasm') ||
        !url.startsWith('http')) {
      return; // Don't call event.respondWith - browser fetches normally
    }
    
    // Only handle requests for our own app path
    let requestUrl;
    try {
      requestUrl = new URL(url);
    } catch (e) {
      return; // Invalid URL, let browser handle
    }
    
    if (!requestUrl.pathname.startsWith(GHPATH)) {
      return; // Not our app, let browser handle
    }
    
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request.clone())
            .then((response) => {
              // Check if we received a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response and cache it
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
              return response;
            });
        })
        .catch((error) => {
          console.error('Fetch handler error:', error);
          // If both cache and network fail, show offline page for documents
          if (event.request.destination === 'document') {
            return caches.match(`${GHPATH}/index.html`)
              .then((fallback) => fallback || new Response('Offline', { status: 503 }));
          }
          return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
        })
    );
  } catch (e) {
    console.error('SW fetch event error:', e);
    // Don't call event.respondWith - let browser handle the request normally
    return;
  }
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker now controlling all clients');
        return self.clients.claim(); // Take control of all pages immediately
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle any background sync tasks
  return Promise.resolve();
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New palm reading insights available!',
    icon: `${GHPATH}/icon.svg`,
    badge: `${GHPATH}/icon.svg`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Reading',
        icon: `${GHPATH}/icon.svg`
      },
      {
        action: 'close',
        title: 'Close',
        icon: `${GHPATH}/icon.svg`
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Mystic Palm & Elements', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(`${GHPATH}/`)
    );
  }
}); 