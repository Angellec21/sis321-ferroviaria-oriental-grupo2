# Resumen Técnico — Actividad 7 y Data Warehouse
## DSS Ferroviaria Oriental S.A.

**Repositorio:** https://github.com/Angellec21/sis321-ferroviaria-oriental-grupo2
**Fecha de entrega:** 30 de junio de 2026

---

## 1. Data Warehouse — Lo que se implementó

### 1.1 ¿Qué existía antes?

El esquema `dw` en PostgreSQL ya tenía las tablas creadas, pero:

- `dw.metrica_ocupacion` — tenía 722 filas de **datos sintéticos** generados para entrenar el modelo de IA, no desde transacciones reales.
- `dw.metrica_combustible` — **completamente vacía** (0 filas).
- `dw.indicador` y `dw.tablero_control` — existían pero sin conexión real a ningún proceso.
- No existía ningún proceso ETL que leyera los datos reales (reservas, viajes, pagos) y los cargara en las tablas analíticas.

### 1.2 Qué se construyó

Se implementó el pipeline ETL completo y el tablero gerencial conectado al DW real.

---

## 2. Pipeline ETL

**Archivo:** `backend/src/controllers/etlController.js`
**Rutas:** `backend/src/routes/etlRoutes.js`

### ETL 1 — Ocupación real desde reservas

Lee los datos transaccionales reales y calcula la tasa de ocupación por ruta, vagón y fecha.

**Tablas fuente (OLTP):**
- `dw.viaje` → fecha del viaje y ruta
- `dw.reserva` → asientos vendidos (estado = `pagada`)
- `dw.asiento` → a qué vagón pertenece cada asiento
- `dw.wagon_pasajeros` → capacidad total del vagón

**Tabla destino (DW):**
- `dw.metrica_ocupacion` → inserta o actualiza con `ON CONFLICT DO UPDATE`

**Fórmula aplicada:**
```
tasa_ocupacion = (asientos_vendidos / asientos_totales) × 100
estado_ruta:
  ≥ 70% → "alta"
  30–69% → "normal"
  < 30%  → "baja"
```

### ETL 2 — Combustible estimado desde viajes

Lee los viajes completados o en tránsito y calcula el consumo de combustible estimado por ruta.

**Tablas fuente (OLTP):**
- `dw.viaje` → estado del viaje y ruta asociada
- `dw.ruta_ferroviaria` → distancia en km y rendimiento km/litro

**Tabla destino (DW):**
- `dw.metrica_combustible` → inserta o actualiza

**Fórmulas aplicadas:**
```
combustible_consumido (L) = distancia_km / rendimiento_kml
costo_combustible (Bs)    = combustible_consumido × 3.72   (precio diesel Bolivia)
desviacion (%)            = diferencia vs rendimiento base de 4.5 km/L
```

### Endpoints ETL

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/admin/etl/ejecutar` | Solo administrador | Ejecuta los 2 procesos ETL y retorna filas procesadas |
| `GET` | `/api/admin/etl/estado` | Gerente + Admin | Estado actual de las tablas analíticas del DW |

### Resultado del ETL (datos reales procesados)

```
metrica_ocupacion:  723 filas (722 históricas + 1 real calculada)
metrica_combustible: 2 filas (2 viajes completados/en tránsito)

KPIs calculados:
  Ocupación promedio:     59.8%
  Costo combustible:      Bs 517.43
  Combustible consumido:  139.09 litros
  Rendimiento flota:      4.70 km/L
```

---

## 3. Actividad 7 — Dashboard Gerencial

### 3.1 Paso 1 — Librería de gráficos

**Librería elegida:** `recharts`

Ya estaba instalada en el proyecto (`frontend/package.json`). Es el equivalente React de Chart.js, con API declarativa en JSX. Se usaron 4 tipos de componentes:

```
BarChart   → Gráfico 1, 3 y 5
PieChart   → Gráfico 2
LineChart  → Gráfico 4
```

---

### 3.2 Paso 2 — Endpoint único de KPIs

**Archivo:** `backend/src/controllers/dashboardController.js`
**Ruta:** `GET /api/dashboard/kpis?fecha_inicio=&fecha_fin=`

Una sola consulta SQL con 5 CTEs encadenados retorna todos los KPIs y todas las series para los gráficos en una sola llamada al backend.

**Los 8 KPIs calculados:**

| # | KPI | Fuente SQL | Valor ejemplo |
|---|---|---|---|
| 1 | Ingresos del período (Bs) | `SUM(pago.monto)` WHERE confirmado | Bs 515.00 |
| 2 | Total de transacciones | `COUNT(pago)` | 9 |
| 3 | Ticket promedio (Bs) | `AVG(pago.monto)` | Bs 57.22 |
| 4 | Ocupación promedio (%) | `AVG(metrica_ocupacion.tasa_ocupacion)` | 59.8% |
| 5 | Reservas activas | `COUNT(reserva)` WHERE activa | 0 |
| 6 | Trenes operativos | `COUNT(tren)` WHERE operativo | 5 |
| 7 | Usuarios activos | `COUNT(usuarios)` WHERE estado=true | 23 |
| 8 | Mantenimientos urgentes | `COUNT(orden_mant)` WHERE restantes < 50 | 0 |

**Las 5 series para gráficos (retornadas como JSON):**

| Serie | Datos | Uso |
|---|---|---|
| `serie_ingresos_dia` | Ingresos y cantidad por día | Gráfico 1 — Barras |
| `serie_ingresos_metodo` | Total por QR / Transferencia / Ventanilla | Gráfico 2 — Pie |
| `serie_ocupacion_ruta` | % ocupación por ruta | Gráfico 3 — Barras |
| `serie_tendencia` | Promedio semanal DW últimas 12 semanas | Gráfico 4 — Línea |
| `serie_mantenimiento` | Cantidad por prioridad | Gráfico 5 — Barras |

---

### 3.3 Paso 3 — Los 5 gráficos implementados

**Archivo:** `frontend/src/pages/Dashboard.jsx`

#### Gráfico 1 — Ingresos por Día (Barras agrupadas)
- Tipo: `BarChart` con dos barras por día
- Datos: ingresos en Bs + cantidad de transacciones
- Eje X: fecha · Eje Y: monto en Bs

#### Gráfico 2 — Distribución de Pagos (Pie chart)
- Tipo: `PieChart` con `Pie` y `Cell`
- Datos: QR / Transferencia / Ventanilla con monto y %
- Colores diferenciados por método

#### Gráfico 3 — Ocupación por Ruta (Barras horizontales)
- Tipo: `BarChart` con `layout="vertical"`
- Datos: % de ocupación promedio por ruta del DW
- Colores semáforo: rojo ≥70% · amarillo 30–69% · verde <30%

#### Gráfico 4 — Tendencia de Ocupación Semanal (Línea)
- Tipo: `LineChart` con `type="monotone"`
- Datos: promedio semanal de `dw.metrica_ocupacion` (últimas 12 semanas)
- 11 puntos de datos históricos

#### Gráfico 5 — Mantenimiento por Prioridad (Barras)
- Tipo: `BarChart` con colores semáforo por prioridad
- Datos: urgente / próximo / normal
- Colores: rojo / amarillo / verde

---

### 3.4 Paso 4 — Filtros Dinámicos por Fecha

El Dashboard tiene un formulario con dos `<input type="date">` (Desde / Hasta):

- Al cambiar el rango y presionar **Filtrar**, se hace una llamada `GET /api/dashboard/kpis?fecha_inicio=...&fecha_fin=...`
- Todos los KPIs y gráficos se redibujan automáticamente con React (sin recarga de página)
- Botón **"Últimos 6 meses"** para restablecer el filtro por defecto

---

### 3.5 Paso 5 — Pruebas de Integración (10 casos)

| # | Caso de Prueba | Datos de Entrada | Resultado Esperado | Estado |
|---|---|---|---|---|
| TC-01 | Login con credenciales válidas | `admin@demo.com` / `Demo2026!` | HTTP 200, JWT access + refresh token | ✅ PASS |
| TC-02 | Login con contraseña incorrecta | `admin@demo.com` / `wrongpass` | HTTP 401, `INVALID_CREDENTIALS` | ✅ PASS |
| TC-03 | Acceso sin token | `GET /api/usuarios` sin Authorization | HTTP 401, `NO_TOKEN` | ✅ PASS |
| TC-04 | Acceso con rol insuficiente | `DELETE /api/usuarios/1` con token operador | HTTP 403, `INSUFFICIENT_ROLE` | ✅ PASS |
| TC-05 | Compra pública sin registro | `POST /api/public/compras` con viaje + pasajeros | HTTP 201, código venta `WEB...` | ✅ PASS |
| TC-06 | Asiento ya reservado | Mismo `id_asiento` en segunda compra | HTTP 409, `SEAT_ALREADY_RESERVED` | ✅ PASS |
| TC-07 | Pago QR exitoso | `POST /api/public/pagos` `{tipo_pago:"qr"}` | HTTP 201, pago confirmado, reservas en estado `pagada` | ✅ PASS |
| TC-08 | Dashboard KPIs completo | `GET /api/dashboard/kpis` con token válido | HTTP 200, 8 KPIs + 5 series JSON | ✅ PASS |
| TC-09 | ETL Data Warehouse | `POST /api/admin/etl/ejecutar` con token admin | HTTP 200, filas insertadas en DW | ✅ PASS |
| TC-10 | Recuperar contraseña | `POST /api/auth/olvide-password` | HTTP 200, mensaje genérico, token en BD | ✅ PASS |

**Resultado general: 10/10 PASS**

---

### 3.6 Paso 6 — Preparación para Demo

**Usuario demo creado:**

| Campo | Valor |
|---|---|
| Email | `admin@demo.com` |
| Contraseña | `Demo2026!` |
| Rol | administrador (acceso total) |

**Otros usuarios disponibles:**

| Email | Contraseña | Rol |
|---|---|---|
| `admin@ferroviariaoriental.com.bo` | `admin123` | administrador |
| `gerente1@ferroviariaoriental.com.bo` | `gerente123` | gerente |
| `operador1@ferroviariaoriental.com.bo` | `operador123` | operador |

**Datos de prueba en base de datos:**

| Tabla | Registros |
|---|---|
| `dw.usuarios` | 23 (incluyendo admin@demo.com) |
| `dw.tren` | 5 operativos |
| `dw.ruta_ferroviaria` | 4 rutas activas |
| `dw.viaje` | 3 viajes |
| `dw.reserva` | 10 reservas |
| `dw.pago` | 9 pagos confirmados |
| `dw.metrica_ocupacion` | 723 filas (DW histórico + ETL real) |
| `dw.metrica_combustible` | 2 filas (ETL real) |

**Sistema levantado en:**

```
http://localhost:5173      → Frontend React (Dashboard gerencial)
http://localhost:3000      → Backend Node.js / Express
http://localhost:5173/comprar → Compra pública sin registro
```

---

## 4. Arquitectura Final del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│                      http://localhost:5173                          │
│                                                                     │
│  Dashboard.jsx ─→ GET /api/dashboard/kpis ─→ 8 KPIs + 5 gráficos  │
│  (filtros dinámicos: fecha_inicio / fecha_fin)                      │
│  (botón ETL para admins → POST /api/admin/etl/ejecutar)             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP / JSON
┌────────────────────────────▼────────────────────────────────────────┐
│                        BACKEND (Node.js + Express)                  │
│                       http://localhost:3000                         │
│                                                                     │
│  /api/auth/*           → JWT (24h) + Refresh Token (7d)            │
│  /api/dashboard/kpis   → 1 SQL con 5 CTEs → 8 KPIs + 5 series     │
│  /api/admin/etl/*      → Pipeline ETL (ocupación + combustible)    │
│  /api/reportes/*       → Query A (ingresos), B (ocupación), C (mant)│
│  /api/public/*         → Compra sin registro + pasarela de pagos   │
│                                                                     │
│  Redis (TTL 5 min)  → Caché de permisos por rol                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ SQL
┌────────────────────────────▼────────────────────────────────────────┐
│                     PostgreSQL — Esquema DW                         │
│                                                                     │
│  TABLAS OLTP (transaccional):                                       │
│    usuario, venta, reserva, pago, viaje, asiento, wagon...          │
│                                                                     │
│  TABLAS ANALÍTICAS (Data Warehouse):                                │
│    metrica_ocupacion   → 723 filas (ETL desde reserva + asiento)   │
│    metrica_combustible → 2 filas  (ETL desde viaje + ruta)         │
│    indicador           → 4 indicadores definidos                    │
│    tablero_control     → 3 tableros configurados                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Archivos Creados o Modificados

### Backend

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/controllers/dashboardController.js` | **Nuevo** | Endpoint `/api/dashboard/kpis` — consulta única con 8 KPIs + 5 series |
| `src/routes/dashboardRoutes.js` | **Nuevo** | Ruta `GET /kpis` con verificación de permiso |
| `src/controllers/etlController.js` | **Nuevo** | ETL 1 (ocupación) + ETL 2 (combustible) + estado DW |
| `src/routes/etlRoutes.js` | **Nuevo** | Rutas `/ejecutar` y `/estado` con control de roles |
| `src/index.js` | **Modificado** | Registra `/api/dashboard` y `/api/admin/etl` |

### Frontend

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/pages/Dashboard.jsx` | **Reescrito** | Tablero unificado: 8 KPIs + 5 gráficos + filtros dinámicos + estado DW + botón ETL |

### Documentación

| Archivo | Descripción |
|---|---|
| `ACTIVIDAD-7.md` | Documentación completa paso a paso de la Actividad 7 |
| `RESUMEN-ACTIVIDAD7-DW.md` | Este documento |

### Base de Datos

| Acción | Detalle |
|---|---|
| ETL ejecutado | `dw.metrica_combustible` poblada con datos reales |
| `dw.metrica_ocupacion` actualizada | 1 fila real desde reservas reales |
| Usuario demo creado | `admin@demo.com` / `Demo2026!` rol administrador |

---

## 6. Checklist Final

### Data Warehouse
- [x] Tablas analíticas (`metrica_ocupacion`, `metrica_combustible`) creadas en esquema `dw`
- [x] ETL 1: calcula tasa de ocupación real desde `reserva` + `asiento` + `wagon_pasajeros`
- [x] ETL 2: calcula consumo de combustible desde `viaje` + `ruta_ferroviaria`
- [x] `POST /api/admin/etl/ejecutar` — pipeline ejecutable manualmente por admin
- [x] `GET /api/admin/etl/estado` — estado en tiempo real del DW
- [x] ETL usa `ON CONFLICT DO UPDATE` (upsert) — idempotente, se puede correr múltiples veces
- [x] Botón en el Dashboard para que el admin actualice el DW desde la interfaz

### Actividad 7
- [x] Paso 1: Librería `recharts` instalada y funcionando
- [x] Paso 2: `GET /api/dashboard/kpis` — 8 KPIs + 5 series en una sola consulta SQL optimizada
- [x] Paso 3: 5 gráficos diferentes (barras, barras horizontales, pie, línea, barras con semáforo)
- [x] Paso 4: Filtros dinámicos por rango de fechas — recarga gráficos sin recargar la página
- [x] Paso 5: 10 casos de prueba de integración documentados — todos PASS
- [x] Paso 6: Usuario `admin@demo.com` creado, datos representativos cargados, flujo verificado
