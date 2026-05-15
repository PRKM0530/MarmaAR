/**
 * sw.js - Marma AR Service Worker
 *
 * This file is the heart of offline support. When the browser installs it,
 * it downloads every file the app needs and puts them in a local cache.
 * After that, the app opens instantly from cache and doesn't need a server
 * at all - even if you take the website down.
 *
 * HOW IT WORKS:
 *   Install  → download all shell files into cache
 *   Activate → delete old caches from previous versions
 *   Fetch    → decide whether to serve from cache or network for each request
 *
 * IMPORTANT: bump VERSION any time you deploy changes, so users get
 * the new files instead of the old cached ones.
 */

const VERSION = 'marma-v1.0.0-dev';   // bumped - forces cache refresh

// Everything the app needs to work completely offline.
// All JS, CSS, the model, icons, fonts fallback - all cached on first install.
const SHELL = [
  './',
  './index.html',          // Home / Directory page
  './ar.html',             // AR Camera view
  './manifest.json',
  './css/style.css',
  './css/ar.css',
  './js/data.js',
  './js/main.js',
  './js/ar.js',
  './js/pose-engine.js',
  './js/renderer.js',
  './js/mediapipe/vision_bundle.mjs',
  './js/mediapipe/wasm/vision_wasm_internal.js',
  './js/mediapipe/wasm/vision_wasm_internal.wasm',
  './models/pose_landmarker_lite.task',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: cache everything upfront ────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(cache => {
        // Cache each file individually so one failure doesn't block the rest.
        // The model is large (~3.4 MB) so we give it a bit of leeway.
        return Promise.allSettled(
          SHELL.map(url =>
            cache.add(url).catch(err =>
              console.warn('[SW] Could not cache:', url, err.message)
            )
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => {
          console.info('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network ─────────────────
// Strategy: cache-first for everything (we pre-cached all files, so
// this just means "serve instantly from disk, no network needed").
// If something isn't cached yet (e.g. a new JS file on an old SW),
// try the network and save the result for next time.
self.addEventListener('fetch', e => {
  // Only intercept GET requests - ignore POST, etc.
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      // Not in cache - fetch from network and save for next time
      return fetch(e.request).then(resp => {
        // Only cache valid, non-error responses
        if (!resp || resp.status !== 200 || resp.type === 'error') {
          return resp;
        }
        // Don't cache opaque responses (cross-origin without CORS)
        // - they can unpredictably consume cache quota
        if (resp.type === 'opaque') return resp;

        const toCache = resp.clone();
        caches.open(VERSION).then(cache => cache.put(e.request, toCache));
        return resp;
      });
    }).catch(() => {
      // Both cache miss AND network failure - return a helpful offline page
      // for navigations, or a 503 for sub-resources
      if (e.request.destination === 'document') {
        return caches.match('./index.html');
      }
      return new Response('Offline - resource not available', { status: 503 });
    })
  );
});
