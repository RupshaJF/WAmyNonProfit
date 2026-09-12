/* সার্ভিস ওয়ার্কার — অ্যাপ ইনস্টল, অফলাইন সাপোর্ট ও ক্যাশিং হ্যান্ডেল করে */
const CACHE_VERSION = 'rjf-v1.03.12';
const STATIC_CACHE = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

/* মূল অ্যাপ-শেল — প্রথম ভিজিটেই ক্যাশ হয়ে যাবে, পরে অফলাইনেও কাজ করবে */
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/nav.css',
  '/css/hero.css',
  '/css/sections.css',
  '/css/location.css',
  '/css/footer.css',
  '/css/feedback.css',
  '/css/legal.css',
  '/css/donate.css',
  '/css/member.css',
  '/js/data.js',
  '/js/icons.js',
  '/js/nav.js',
  '/js/hero.js',
  '/js/sections.js',
  '/js/location.js',
  '/js/legal.js',
  '/js/donate.js',
  '/js/member-data.js',
  '/js/member.js',
  '/js/footer.js',
  '/js/feedback.js',
  '/js/router.js',
  '/js/main.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key.indexOf(CACHE_VERSION) !== 0; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* নেভিগেশন রিকোয়েস্ট: নেটওয়ার্ক আগে, ব্যর্থ হলে ক্যাশ, একদম না পেলে অফলাইন পেজ */
function handleNavigation(event) {
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(STATIC_CACHE).then(function (cache) { cache.put('/index.html', copy); });
        return response;
      })
      .catch(function () {
        return caches.match(event.request)
          .then(function (cached) { return cached || caches.match('/index.html'); })
          .then(function (fallback) { return fallback || caches.match('/offline.html'); });
      })
  );
}

/* স্ট্যাটিক ফাইল (css/js/img): ক্যাশ আগে, তারপর নেটওয়ার্ক দিয়ে আপডেট (stale-while-revalidate) */
function handleStatic(event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () { return cached; });
      return cached || networkFetch;
    })
  );
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // বাইরের রিসোর্স (ফন্ট/আইকন CDN) ব্রাউজার নিজে হ্যান্ডেল করবে

  if (req.mode === 'navigate') {
    handleNavigation(event);
    return;
  }

  if (['style', 'script', 'image', 'font'].indexOf(req.destination) !== -1) {
    handleStatic(event);
  }
});
