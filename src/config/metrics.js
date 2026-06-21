// ============================================
// Métricas Prometheus - Monitoreo (Grafana + Prometheus)
// Equivale al nodo "Monitoreo (Grafana + Prometheus)" del diagrama de despliegue
// ============================================

import client from 'prom-client';

const registro = new client.Registry();
client.collectDefaultMetrics({ register: registro, prefix: 'dss_' });

export const httpRequestDuration = new client.Histogram({
  name: 'dss_http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['metodo', 'ruta', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

export const httpRequestsTotal = new client.Counter({
  name: 'dss_http_requests_total',
  help: 'Total de peticiones HTTP recibidas',
  labelNames: ['metodo', 'ruta', 'status']
});

export const cachePermisosHits = new client.Counter({
  name: 'dss_cache_permisos_total',
  help: 'Hits/Misses del caché de permisos en Redis',
  labelNames: ['resultado'] // 'hit' | 'miss'
});

export const loginsTotal = new client.Counter({
  name: 'dss_logins_total',
  help: 'Intentos de login',
  labelNames: ['resultado'] // 'exitoso' | 'fallido'
});

registro.registerMetric(httpRequestDuration);
registro.registerMetric(httpRequestsTotal);
registro.registerMetric(cachePermisosHits);
registro.registerMetric(loginsTotal);

export default registro;
