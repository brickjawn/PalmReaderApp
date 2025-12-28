// Change this to your repository name
var GHPATH = '/PalmReaderApp';

// Choose a different app prefix name
var APP_PREFIX = 'palmreader_';

// The version of the cache. Every time you change any of the files
// you need to change this version (version_01, version_02…). 
// If you don't change the version, the service worker will give your
// users the old files!
var VERSION = 'version_06';

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

// Fetch event - let browser handle all requests
// Note: We don't intercept fetch requests because:
// 1. The app relies on external CDNs (TensorFlow, Tailwind) that can't be cached reliably
// 2. This prevents SW caching issues while keeping other SW features (push notifications) working
// 3. True offline support isn't possible anyway due to CDN dependencies
self.addEventListener('fetch', (event) => {
  // Don't call event.respondWith() - let browser handle everything normally
  return;
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