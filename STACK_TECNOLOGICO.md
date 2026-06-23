# Stack Tecnológico — DSS Ferroviaria Oriental S.A.

Documento de referencia con **todos** los frameworks, librerías e infraestructura
usados en el sistema, organizados por componente. Cada componente corresponde a
un nodo del **Diagrama de Despliegue** (Actividad 3).

---

## 1. Resumen ejecutivo

| Componente | Lenguaje | Framework principal | Rol en el diagrama |
|---|---|---|---|
| `backend/` | JavaScript (Node.js) | **Express.js** | Servidor de Aplicaciones |
| `frontend/` | JavaScript (React) | **React + Vite** | App React SPA + Service Worker (PWA) |
| `ia/` | Python | **TensorFlow/Keras + FastAPI** | Servidor de IA (Modelo Predictivo de Demanda) |
| `mobile/` | JavaScript (React Native) | **Expo** | App Móvil (Android/iOS) |
| Infraestructura | — | **Nginx, PostgreSQL, Redis, Prometheus, Grafana** | Balanceador, BD, Caché, Monitoreo |

---

## 2. Backend — `backend/`

**Framework principal: [Express.js](https://expressjs.com/) 4.18** corriendo sobre **Node.js v26**.

Arquitectura: API REST en capas (rutas → controladores → modelo → BD), sin ORM
(SQL directo con el driver `pg`).

| Librería | Versión | Para qué se usa |
|---|---|---|
| `express` | ^4.18.2 | Framework HTTP, enrutamiento, middlewares |
| `pg` | ^8.11.3 | Driver/cliente de PostgreSQL (queries SQL directas) |
| `ioredis` | ^5.11.1 | Cliente de Redis (caché de permisos por rol) |
| `jsonwebtoken` | ^9.0.2 | Generar/verificar JWT (access + refresh token) |
| `bcrypt` | ^5.1.1 | Hash de contraseñas (10 rounds) |
| `express-validator` | ^7.0.0 | Validación y sanitización de inputs (registro, login, recuperación) |
| `helmet` | ^7.1.0 | Headers de seguridad HTTP (CSP, HSTS, etc.) |
| `cors` | ^2.8.5 | Política de CORS configurable por origen |
| `dotenv` | ^16.3.1 | Variables de entorno desde `.env` |
| `prom-client` | ^15.1.3 | Exporta métricas en formato Prometheus (`/metrics`) |
| `nodemon` (dev) | ^3.0.2 | Recarga automática en desarrollo |

**Patrones implementados:**
- Autenticación JWT (access 24h + refresh 7d, revocable en BD)
- RBAC: roles (`administrador`, `gerente`, `operador`) + permisos granulares por módulo/acción
- Middleware de caché (Redis) delante de las consultas de permisos
- Transacciones SQL explícitas (`BEGIN/COMMIT/ROLLBACK`) para venta+reserva y pago
- Cliente HTTP nativo (`fetch`) para llamar al Servidor de IA (Python)

---

## 3. Frontend — `frontend/`

**Framework principal: [React](https://react.dev/) 19** con **[Vite](https://vite.dev/)** como bundler/dev server (no Create React App).

| Librería | Versión | Para qué se usa |
|---|---|---|
| `react` / `react-dom` | ^19.2.6 | Librería de UI (componentes, hooks) |
| `react-router-dom` | ^7.18.0 | Enrutamiento SPA (rutas protegidas y públicas) |
| `axios` | ^1.18.0 | Cliente HTTP hacia el backend (`/api`) |
| `recharts` | ^3.8.1 | Gráficos del dashboard (pie/bar charts) |
| Service Worker nativo (sin librería) | — | PWA: cache del app-shell + cola offline (IndexedDB + Background Sync API) |

**Patrones implementados:**
- Interceptores de axios: adjuntan JWT automáticamente, renuevan el access token con el refresh token ante un 401
- Contexto de React (`AuthContext`) para sesión/permisos globales
- Rutas protegidas por permiso (ocultan/bloquean según el rol del usuario)
- Proxy `/api` configurado en `vite.config.js` (dev) — en producción lo hace Nginx — para evitar *mixed content* al servir por HTTPS

---

## 4. Servidor de IA — `ia/`

**Framework principal: [TensorFlow](https://www.tensorflow.org/)/Keras 2.16** (modelo) + **[FastAPI](https://fastapi.tiangolo.com/)** (servidor).

| Librería | Versión | Para qué se usa |
|---|---|---|
| `tensorflow` / `tensorflow-macos` | 2.16.2 | Red neuronal (Keras `Sequential`) para el modelo predictivo |
| `fastapi` | 0.128.8 | Framework web async para exponer el modelo |
| `uvicorn` | 0.39.0 | Servidor ASGI que corre la app FastAPI |
| `pandas` | 2.3.3 | Carga y transformación del histórico de ocupación |
| `numpy` | 1.26.4 | Vectorización de features para el modelo |
| `psycopg2-binary` | 2.9.12 | Leer datos históricos directo de PostgreSQL |
| `pydantic` | 2.13.4 | Validación de esquemas de request/response en FastAPI |

**Modelo:** red neuronal densa (16→8→1, activación sigmoid) que predice la tasa
de ocupación (%) dado `id_ruta` (one-hot) + `día_semana` (one-hot) + tendencia
temporal. MAE de validación ≈ 5 puntos porcentuales.

**Nota de protocolo:** el diagrama de despliegue especifica **gRPC** entre el
backend y el Servidor de IA; aquí se implementó **REST** por simplicidad/tiempo
(documentado también en `backend/infra/README.md`).

---

## 5. App Móvil — `mobile/`

**Framework principal: [React Native](https://reactnative.dev/) 0.85** vía **[Expo](https://expo.dev/) SDK 56** (no React Native CLI puro).

| Librería | Versión | Para qué se usa |
|---|---|---|
| `expo` | ~56.0.12 | Toolchain/runtime (build, dev server, APIs nativas) |
| `react-native` | 0.85.3 | Motor de UI nativo multiplataforma |
| `@react-navigation/native` + `native-stack` | ^7.x | Navegación entre pantallas (Login → Viajes → Asientos) |
| `axios` | ^1.18.0 | Cliente HTTP (misma API que el frontend web) |
| `@react-native-async-storage/async-storage` | 2.2.0 | Persistencia del JWT en el dispositivo |
| `react-native-web` | ^0.21.2 | Permite correr el mismo código en navegador (sin emulador) |

**Limitación documentada:** corrido y verificado en modo web
(`npx expo start --web`) por no contar esta máquina con Xcode+simulador iOS ni
Android Studio/SDK. El código es el mismo que correría en un dispositivo real.

---

## 6. Base de Datos

**[PostgreSQL](https://www.postgresql.org/) 16.14** — esquema `dw` (Data Warehouse), 23+ tablas normalizadas en 3FN
(MER de la Actividad 3): usuarios, roles, permisos, estaciones, trenes, vagones,
rutas, viajes, asientos, reservas, ventas, pagos (con especialización
QR/Transferencia/Ventanilla), indicadores y métricas de ocupación/combustible.

Sin ORM: todas las queries son SQL plano via el driver `pg`, con índices,
constraints `CHECK`, FKs y un índice único parcial (excluye reservas
canceladas para permitir re-vender un asiento liberado).

---

## 7. Infraestructura (no es código de aplicación)

| Herramienta | Versión | Nodo del diagrama | Rol |
|---|---|---|---|
| **Nginx** | 1.31.2 | Balanceador de Carga | Termina TLS (cert. autofirmado), balancea round-robin entre 2 instancias del backend (`:3000`/`:3001`), proxea `/` al frontend |
| **Redis** | 8.8.0 | Caché de sesiones | Cachea permisos por rol (TTL 5 min), header `X-Permisos-Cache` para verificar HIT/MISS |
| **Prometheus** | 3.12.0 | Monitoreo | Scrapea `/metrics` de ambas instancias del backend cada 15s |
| **Grafana** | 13.0.2 | Monitoreo | Dashboard con 6 paneles (requests/seg, latencia P95, cache hit/miss, logins, memoria, instancias activas) |

---

## 8. Diagrama de Despliegue → Stack (mapeo 1:1)

```
App React SPA ─────────────► React 19 + Vite          (frontend/)
Service Worker (PWA) ──────► Service Worker API nativa (frontend/public/sw.js)
App Móvil (React Native) ──► React Native 0.85 + Expo  (mobile/)
Balanceador (Nginx) ───────► Nginx 1.31               (backend/infra/)
Pasarela de Pagos ─────────► Simulada dentro de Express (backend/src/controllers/publicoController.js)
Servidor de Apps (Node.js) ► Express 4.18 + Node 26     (backend/)
PostgreSQL 16 ──────────────► PostgreSQL 16.14
Redis (Caché sesiones) ────► Redis 8.8 + ioredis        (backend/src/config/redis.js)
Servidor de IA (TensorFlow)► TensorFlow 2.16 + FastAPI  (ia/)
Monitoreo (Grafana+Prom.) ─► Prometheus 3.12 + Grafana 13 (backend/infra/)
```

---

## 9. Lo que NO se usó (para que no haya ambigüedad)

- ❌ Spring Boot (el diagrama lo menciona como alternativa a Node.js; se eligió 100% Node)
- ❌ Ningún ORM (Sequelize, Prisma, TypeORM) — SQL directo a propósito
- ❌ MySQL — se usó PostgreSQL (documentado y justificado en `backend/README.md`)
- ❌ gRPC real — el Servidor de IA usa REST (documentado en el punto 4)
- ❌ Redux/Zustand — el estado global del frontend es solo Context API de React
