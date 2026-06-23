// ============================================
// Cliente Redis - Caché de sesiones/permisos
// Equivale al nodo "Redis (Caché de sesiones)" del diagrama de despliegue
// ============================================

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 200, 2000)
});

redis.on('connect', () => console.log('[REDIS] Conectado'));
redis.on('error', (err) => console.error('[REDIS] Error:', err.message));

const TTL_PERMISOS_SEGUNDOS = 300; // 5 minutos

export const obtenerPermisosCache = async (idRol) => {
  try {
    const cacheado = await redis.get(`permisos:rol:${idRol}`);
    return cacheado ? JSON.parse(cacheado) : null;
  } catch {
    return null; // si Redis falla, el caller debe ir a la BD
  }
};

export const guardarPermisosCache = async (idRol, permisos) => {
  try {
    await redis.set(`permisos:rol:${idRol}`, JSON.stringify(permisos), 'EX', TTL_PERMISOS_SEGUNDOS);
  } catch {
    // cache best-effort, no rompe el flujo si Redis no esta disponible
  }
};

export const invalidarPermisosCache = async (idRol) => {
  try {
    await redis.del(`permisos:rol:${idRol}`);
  } catch {
    // no-op
  }
};

export default redis;
