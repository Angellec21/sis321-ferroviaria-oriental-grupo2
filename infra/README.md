# Infraestructura local (Diagrama de Despliegue)

Esta carpeta documenta cómo se implementaron localmente los nodos de infraestructura
del Diagrama de Despliegue (Actividad 3) que no son código de aplicación.

## Balanceador de Carga (Nginx)

`nginx-dss-ferroviaria.conf` — copiarlo a `$(brew --prefix)/etc/nginx/servers/`.

- Termina TLS (certificado autofirmado) en `https://localhost:8443`
- `upstream dss_backend` balancea round-robin entre 2 instancias de la API:
  - `localhost:3000` (vía `npm run dev`)
  - `localhost:3001` (segunda instancia: `PORT=3001 node src/index.js`)
- `/` proxea al frontend (Vite, `localhost:5173`)
- `/api/*` y `/health` proxean al backend balanceado

Generar el certificado autofirmado usado:
```bash
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout dss-selfsigned.key -out dss-selfsigned.crt \
  -subj "/C=BO/ST=SantaCruz/L=SantaCruzDeLaSierra/O=FerroviariaOriental/CN=localhost"
```

## Redis (Caché de sesiones/permisos)

No requiere configuración adicional: `brew install redis && brew services start redis`.
El backend se conecta vía `src/config/redis.js` (variables `REDIS_HOST`/`REDIS_PORT` en `.env`).

Cachea los permisos por rol 5 minutos. Verificar con:
```bash
curl -i http://localhost:3000/api/usuarios -H "Authorization: Bearer <token>" | grep X-Permisos-Cache
```

## Monitoreo (Prometheus + Grafana)

`prometheus.yml` — copiarlo a `$(brew --prefix)/etc/prometheus.yml`.

- Prometheus (`localhost:9090`) scrapea `/metrics` de ambas instancias del backend
- El backend expone métricas con `prom-client` (`src/config/metrics.js`):
  request HTTP, latencia, hits/miss de caché Redis, logins exitosos/fallidos
- Grafana corre en `localhost:3030` (puerto 3000 lo ocupa el backend) —
  datasource Prometheus + dashboard "DSS Ferroviaria Oriental - Monitoreo"
  importado vía API (`POST /api/dashboards/db`)

## Service Worker / PWA

Implementado del lado del frontend (`dss-ferroviaria-frontend/public/sw.js`),
no requiere infraestructura adicional. Cachea el app shell y encola en
IndexedDB las ventas/pagos hechos sin conexión, sincronizándolos con la
Background Sync API cuando vuelve la red (mismo concepto de
`cola_sincronizacion` de la Actividad 3).

## Pendiente (fuera de este sprint)

- **App móvil (React Native)** — requiere stack de desarrollo móvil aparte
- **Servidor de IA (Python/TensorFlow)** — requiere datos históricos reales y entrenamiento de modelo
