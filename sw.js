// Change this to your repository name
var GHPATH = '/PalmReaderApp';

// Choose a different app prefix name
var APP_PREFIX = 'palmreader_';

// The version of the cache. Every time you change any of the files
// you need to change this version (version_01, version_02…). 
// If you don't change the version, the service worker will give your
// users the old files!
var VERSION = 'version_02';

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
  const url = event.request.url;
  
  // Skip external CDN and WASM requests - let browser handle directly
  if (url.includes('cdn.jsdelivr.net') || 
      url.includes('cdn.tailwindcss.com') || 
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.endsWith('.wasm')) {
    return; // Don't call event.respondWith - browser fetches normally
  }
  
  event.respondWith(
    (async () => {
      try {
        // Try to get from cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Clone the request because it's a stream
        const fetchRequest = event.request.clone();
        const response = await fetch(fetchRequest);
        
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response because it's a stream
        const responseToCache = response.clone();
        
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, responseToCache);
        
        return response;
      } catch (error) {
        console.error('Fetch handler error:', error);
        // If both cache and network fail, show offline page for documents
        if (event.request.destination === 'document') {
          return caches.match(`${GHPATH}/index.html`);
        }
        return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
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