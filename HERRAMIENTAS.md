# Herramientas Utilizadas — DSS Ferroviaria Oriental S.A.

Listado completo de todas las herramientas, frameworks y servicios usados en
el desarrollo de este proyecto. Para el detalle de librerías de código por
componente, ver [`STACK_TECNOLOGICO.md`](STACK_TECNOLOGICO.md) — este
documento cubre todo lo demás: editores, gestores de paquetes, bases de
datos, control de versiones, IA, etc.

---

## ⚠️ Respuesta directa: ¿se usó LangChain o LangGraph?

**No.** El componente de IA (`ia/`) es una red neuronal simple hecha con
**TensorFlow/Keras** (`Sequential`, capas `Dense`), servida directo con
**FastAPI**. No hay ningún framework de orquestación de agentes ni de LLMs
(ni LangChain, ni LangGraph, ni AutoGen, ni CrewAI) en ninguna parte del
sistema. El "Servidor de IA" del diagrama de despliegue predice un número
(% de ocupación), no genera texto ni usa un modelo de lenguaje.

---

## 1. Lenguajes y Runtimes

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | v26.3.0 | Runtime del backend, frontend (build) y app móvil |
| npm | 11.16.0 | Gestor de paquetes JavaScript |
| Python | 3.9.6 | Runtime del Servidor de IA |
| pip | 26.0.1 | Gestor de paquetes Python |

---

## 2. Bases de Datos y Caché

| Herramienta | Versión | Uso |
|---|---|---|
| **PostgreSQL** | 16.14 | Base de datos relacional principal (esquema `dw`) |
| **Redis** | 8.8.0 | Caché de permisos por rol (sesiones) |
| `psql` | (incluido en PostgreSQL) | Cliente de línea de comandos para ejecutar scripts SQL |
| `redis-cli` | (incluido en Redis) | Cliente de línea de comandos para verificar el caché |

---

## 3. Servidor Web / Infraestructura

| Herramienta | Versión | Uso |
|---|---|---|
| **Nginx** | 1.31.2 | Balanceador de carga (round-robin) + terminación TLS |
| `openssl` | (del sistema) | Generar el certificado autofirmado para HTTPS local |
| **Prometheus** | 3.12.0 | Recolección de métricas (scraping de `/metrics`) |
| **Grafana** | 13.0.2 | Dashboards de monitoreo |

---

## 4. Inteligencia Artificial / Machine Learning

| Herramienta | Versión | Uso |
|---|---|---|
| **TensorFlow / Keras** | 2.16.2 | Entrenamiento del modelo predictivo (red neuronal densa) |
| **FastAPI** | 0.128.8 | Exponer el modelo entrenado como API REST |
| **Uvicorn** | 0.39.0 | Servidor ASGI para correr FastAPI |
| pandas | 2.3.3 | Carga y transformación de datos históricos para entrenamiento |
| NumPy | 1.26.4 | Vectorización de features del modelo |

❌ **No usado:** LangChain, LangGraph, OpenAI API, Anthropic API, AutoGen,
CrewAI, ni ningún LLM. Cero llamadas a modelos de lenguaje en el código del
proyecto.

---

## 5. Backend (API)

| Herramienta | Versión | Uso |
|---|---|---|
| Express.js | 4.18.2 | Framework del servidor HTTP |
| `pg` | 8.11.3 | Driver de PostgreSQL para Node.js |
| `ioredis` | 5.11.1 | Cliente de Redis para Node.js |
| `jsonwebtoken` | 9.0.2 | Generación/verificación de JWT |
| `bcrypt` | 5.1.1 | Hash de contraseñas |
| `express-validator` | 7.0.0 | Validación de inputs |
| `helmet` | 7.1.0 | Headers de seguridad HTTP |
| `prom-client` | 15.1.3 | Exponer métricas a Prometheus |
| `nodemon` | 3.0.2 | Recarga automática en desarrollo |

---

## 6. Frontend Web

| Herramienta | Versión | Uso |
|---|---|---|
| React | 19.2.6 | Librería de interfaz |
| **Vite** | 8.0.16 | Bundler / servidor de desarrollo |
| `react-router-dom` | 7.18.0 | Enrutamiento SPA |
| `axios` | 1.18.0 | Cliente HTTP |
| `recharts` | 3.8.1 | Gráficos del dashboard |

---

## 7. App Móvil

| Herramienta | Versión | Uso |
|---|---|---|
| **Expo (CLI + SDK)** | 54.0.35 | Toolchain de React Native (dev server, build) |
| React Native | (vía Expo SDK 54) | Motor de UI multiplataforma |
| `@react-navigation` | 7.x | Navegación entre pantallas |
| **Expo Go** | (app del usuario, Android) | Cliente para probar la app sin compilar nativo |

---

## 8. Control de Versiones y Colaboración

| Herramienta | Uso |
|---|---|
| **Git** | Control de versiones |
| **GitHub** | Hosting del repositorio (`sis321-ferroviaria-oriental-grupo2`) |
| **GitHub CLI (`gh`)** | Crear/administrar repos, autenticación, archivar/borrar repos desde terminal |
| `git subtree` | Fusionar los 4 sub-proyectos (backend/frontend/ia/mobile) en un monorepo preservando el historial de cada uno |

---

## 9. Pruebas de API

| Herramienta | Uso |
|---|---|
| **Postman** | Colección completa (`backend/postman/DSS-Ferroviaria-Collection.json`) con todos los endpoints |
| `curl` | Pruebas rápidas de endpoints desde terminal durante el desarrollo |

---

## 10. Gestión de Paquetes y Entorno (macOS)

| Herramienta | Uso |
|---|---|
| **Homebrew** | Instalar PostgreSQL, Redis, Nginx, Node.js, Prometheus, Grafana |
| `venv` (Python) | Entorno virtual aislado para las dependencias de IA |
| `brew services` | Gestionar el arranque/parada de PostgreSQL, Redis, Nginx, Prometheus, Grafana |

---

## 11. Editor / Entorno de Desarrollo

| Herramienta | Uso |
|---|---|
| **Visual Studio Code** | Editor principal del proyecto |
| Terminal (zsh) | Ejecución de todos los comandos, scripts e instalaciones |

---

## 12. Resumen — Lo que NO se usó (para evitar ambigüedad)

- ❌ LangChain / LangGraph / cualquier framework de agentes LLM
- ❌ OpenAI, Anthropic API, o cualquier modelo de lenguaje
- ❌ Docker / Docker Compose (todo corre nativo sobre Homebrew)
- ❌ MySQL / MySQL Workbench (se usó PostgreSQL, documentado en `STACK_TECNOLOGICO.md`)
- ❌ ORMs (Sequelize, Prisma, TypeORM) — SQL directo con `pg`
- ❌ Xcode / Android Studio (la app móvil se probó vía Expo Go y modo web)
- ❌ ngrok (bloqueado por política de red; se usó hotspot móvil como alternativa)
