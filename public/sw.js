// ============================================
// Service Worker - DSS Ferroviaria Oriental
// Equivale al nodo "Service Worker (PWA)" del diagrama de despliegue.
// Implementa la estrategia Offline-First documentada en la Actividad 3:
// cachea la app y encola ventas/pagos hechos sin conexión.
// ============================================

const CACHE_VERSION = 'dss-ferroviaria-v1';
const APP_SHELL = ['/', '/manifest.json', '/favicon.svg'];
const DB_NAME = 'dss-cola-sincronizacion';
const STORE_NAME = 'pendientes';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function encolarPeticion(request) {
  const db = await abrirDB();
  const body = await request.clone().text();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body,
      fecha: new Date().toISOString()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function sincronizarPendientes() {
  const db = await abrirDB();
  const pendientes = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const item of pendientes) {
    try {
      const respuesta = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      if (respuesta.ok) {
        const db2 = await abrirDB();
        const tx = db2.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(item.id);
      }
    } catch {
      break; // sigue sin conexión, reintenta en el proximo sync
    }
  }
}

// Operaciones que se encolan si fallan por falta de red (venta/pago = "cola_sincronizacion")
const RUTAS_ENCOLABLES = ['/api/ventas', '/api/public/compras', '/api/pagos', '/api/public/pagos'];

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // App shell / assets estaticos: cache-first
  if (request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cacheada) => cacheada || fetch(request).catch(() => caches.match('/')))
    );
    return;
  }

  // POST a ventas/pagos: si falla la red, encolar para sincronizar despues
  if (request.method === 'POST' && RUTAS_ENCOLABLES.some((r) => url.pathname.startsWith(r))) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        await encolarPeticion(request);
        if ('sync' in self.registration) {
          try { await self.registration.sync.register('sincronizar-ventas'); } catch { /* no-op */ }
        }
        return new Response(
          JSON.stringify({ success: true, offline: true, message: 'Sin conexión: se sincronizará automáticamente.' }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sincronizar-ventas') {
    event.waitUntil(sincronizarPendientes());
  }
});

// Fallback manual para navegadores sin Background Sync API
self.addEventListener('message', (event) => {
  if (event.data === 'sincronizar-ahora') {
    sincronizarPendientes();
  }
});
