# Actividad 7 — Sprint 3: Dashboard Gerencial e Integración Final

**Proyecto:** DSS Ferroviaria Oriental S.A.
**Repositorio:** https://github.com/Angellec21/sis321-ferroviaria-oriental-grupo2
**Estado:** ✅ Completado

---

## Paso 1 — Librería de Gráficos

**Librería elegida:** `recharts` (React-native chart library sobre SVG)

**Razón:** el stack del proyecto ya es React + Vite; recharts se integra como componente sin manipulación del DOM manual. Equivalente funcional a Chart.js con react-chartjs-2, con API más declarativa para JSX.

**Instalación:**
```bash
cd frontend
npm install recharts
```

**Tipos de gráficos implementados (≥ 5):**

| Gráfico | Tipo recharts | Datos |
|---|---|---|
| Gráfico 1 | `BarChart` (agrupado) | Ingresos por día (Bs + transacciones) |
| Gráfico 2 | `PieChart` | Distribución de pagos por método |
| Gráfico 3 | `BarChart` horizontal | Ocupación promedio por ruta |
| Gráfico 4 | `LineChart` | Tendencia de ocupación semanal (DW, 12 semanas) |
| Gráfico 5 | `BarChart` con colores semáforo | Mantenimiento por prioridad |

---

## Paso 2 — KPIs desde el Backend

**Endpoint único:** `GET /api/dashboard/kpis?fecha_inicio=&fecha_fin=`

**Archivo:** `backend/src/controllers/dashboardController.js`

Una sola consulta SQL con CTEs encadenados retorna todos los KPIs y las series temporales para los gráficos:

| KPI | Descripción | Fuente SQL |
|---|---|---|
| KPI 1 | Ingresos del período (Bs) | `SUM(pago.monto)` WHERE confirmado |
| KPI 2 | Transacciones del período | `COUNT(pago)` |
| KPI 3 | Ticket promedio (Bs) | `AVG(pago.monto)` |
| KPI 4 | Ocupación promedio (%) | `AVG(metrica_ocupacion.tasa_ocupacion)` DW |
| KPI 5 | Reservas activas ahora | `COUNT(reserva)` WHERE activa |
| KPI 6 | Trenes operativos | `COUNT(tren)` WHERE operativo |
| KPI 7 | Usuarios activos | `COUNT(usuarios)` WHERE estado = true |
| KPI 8 | Mantenimientos urgentes | `COUNT(orden_mant)` WHERE viajes_restantes < 50 |

**Valores de ejemplo (datos de prueba cargados):**

```json
{
  "kpis": {
    "ingresos_periodo": 515,
    "transacciones": 9,
    "ticket_promedio": 57.22,
    "ocupacion_promedio": 59.8,
    "reservas_activas": 0,
    "trenes_operativos": 5,
    "usuarios_activos": 23,
    "mant_urgentes": 0
  }
}
```

---

## Paso 3 — Gráficos Implementados

El Dashboard (`frontend/src/pages/Dashboard.jsx`) renderiza los 5 gráficos usando los datos del endpoint `/api/dashboard/kpis`:

```jsx
// Ejemplo: Gráfico de línea — tendencia de ocupación semanal
<LineChart data={serieTendencia}>
  <XAxis dataKey="semana" />
  <YAxis unit="%" domain={[0, 100]} />
  <Line type="monotone" dataKey="ocupacion" stroke="#e8742c" strokeWidth={2} />
</LineChart>
```

Todos los gráficos son `responsive` (ResponsiveContainer) y tienen tooltips, leyendas y colores semáforo (rojo/amarillo/verde).

---

## Paso 4 — Filtros Dinámicos

El Dashboard incluye un formulario con dos `date inputs` (Desde / Hasta):

- Al cambiar las fechas y presionar **Filtrar**, se hace una nueva llamada `GET /api/dashboard/kpis?fecha_inicio=&fecha_fin=` con los parámetros actualizados.
- Todos los gráficos y KPIs se redibujan automáticamente con los nuevos datos.
- Botón **"Últimos 6 meses"** para restablecer el filtro por defecto.
- La lógica está en el hook `useCallback` + `useEffect` de React; el estado del filtro vive en `fi` / `ff` (fecha inicio / fin).

---

## Paso 5 — Pruebas de Integración

### Tabla de Casos de Prueba

| # | Caso de Prueba | Precondición | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
|---|---|---|---|---|---|---|
| TC-01 | Login con credenciales válidas | Usuario existe en BD, estado=true | `email: admin@demo.com` `password: Demo2026!` | HTTP 200, `tokens.accessToken` presente, `rol: administrador` | HTTP 200, JWT con 24h de expiración, rol correcto | ✅ PASS |
| TC-02 | Login con contraseña incorrecta | Usuario existe en BD | `email: admin@demo.com` `password: wrongpass` | HTTP 401, `code: INVALID_CREDENTIALS` | HTTP 401, mensaje genérico sin revelar si el email existe | ✅ PASS |
| TC-03 | Acceso a endpoint protegido sin token | Backend corriendo | `GET /api/usuarios` sin header Authorization | HTTP 401, `code: NO_TOKEN` | HTTP 401, `"Token no proporcionado"` | ✅ PASS |
| TC-04 | Acceso con rol insuficiente | Token de operador válido | `DELETE /api/usuarios/1` con token operador | HTTP 403, `code: INSUFFICIENT_ROLE` | HTTP 403, `"Acceso denegado por rol"` | ✅ PASS |
| TC-05 | Compra pública sin registro | Viaje disponible con asientos libres | `POST /api/public/compras` `{id_viaje:1, pasajeros:[...]}` | HTTP 201, código de venta `WEB...` generado | HTTP 201, `codigo_venta: WEB1781813...`, reservas creadas | ✅ PASS |
| TC-06 | Intentar reservar asiento ya tomado | Asiento reservado en otro paso | Mismo `id_asiento` en segunda compra | HTTP 409, `code: SEAT_ALREADY_RESERVED` | HTTP 409, índice parcial único activado | ✅ PASS |
| TC-07 | Procesar pago QR | Compra creada (TC-05) | `POST /api/public/pagos` `{id_venta, tipo_pago:"qr"}` | HTTP 201, `estado_pago: confirmado`, reservas en estado `pagada` | HTTP 201, pago confirmado, registro en `dw.pago_qr` | ✅ PASS |
| TC-08 | Dashboard KPIs — respuesta completa | BD con datos, token válido | `GET /api/dashboard/kpis?fecha_inicio=2024-01-01&fecha_fin=2099-12-31` | HTTP 200, 8 KPIs + 5 series JSON | HTTP 200, todos los campos presentes y calculados correctamente | ✅ PASS |
| TC-09 | Ejecutar ETL del Data Warehouse | Token de administrador | `POST /api/admin/etl/ejecutar` | HTTP 200, `ocupacion.insertados >= 0`, `combustible.insertados >= 0`, `duracionMs > 0` | HTTP 200, 1-2 filas procesadas, `metrica_combustible` poblada | ✅ PASS |
| TC-10 | Recuperar contraseña — generar token | Usuario con email válido | `POST /api/auth/olvide-password` `{email: "admin@demo.com"}` | HTTP 200, mensaje genérico (no revela existencia), token guardado en BD | HTTP 200, `"Si el email existe, recibirás instrucciones"`, `reset_token` en `dw.usuarios` | ✅ PASS |

---

## Paso 6 — Preparación para Demo

### Usuario de Demo

| Campo | Valor |
|---|---|
| Email | `admin@demo.com` |
| Contraseña | `Demo2026!` |
| Rol | `administrador` (acceso completo) |
| Estado | activo |

**Usuarios alternativos** (ver `backend/USUARIOS.md` para la lista completa):

| Email | Password | Rol |
|---|---|---|
| `admin@ferroviariaoriental.com.bo` | `admin123` | administrador |
| `gerente1@ferroviariaoriental.com.bo` | `gerente123` | gerente |
| `operador1@ferroviariaoriental.com.bo` | `operador123` | operador |
| `admin@demo.com` | `Demo2026!` | administrador |

### Datos de Prueba Cargados

- **4 rutas** activas (Santa Cruz-Montero, Montero-Puerto Quijarro, Santa Cruz-Yacuiba, Warnes-Roboré)
- **5 trenes** operativos (TR-001 a TR-005)
- **23 usuarios** (1 admin principal + 1 demo + 7 gerentes + 13 operadores + 1 cliente anónimo)
- **9 pagos** confirmados (QR + Transferencia + Ventanilla)
- **10 reservas** (incluyendo pagadas, activas y canceladas)
- **723 registros** en `dw.metrica_ocupacion` (histórico DW + datos reales ETL)
- **2 registros** en `dw.metrica_combustible` (generados por ETL)

### Flujo Demo Completo (verificado 3 veces)

1. Abrir `http://localhost:5173` → redirige a `/login`
2. Login con `admin@demo.com` / `Demo2026!`
3. Ver Dashboard con los 5 gráficos y 8 KPIs
4. Cambiar filtro de fechas → gráficos se actualizan
5. Botón **⚡ Actualizar DW** → ETL ejecutado, confirmación en pantalla
6. Navegar a **Ingresos**, **Ocupación**, **Mantenimiento** (reportes individuales)
7. Abrir `http://localhost:5173/comprar` → flujo sin registro (cliente)
8. Crear compra → elegir asiento → pago QR → ticket mostrado

### Plan B (si falla la conexión a BD)

```bash
# Verificar PostgreSQL
brew services restart postgresql@16

# Verificar que la BD existe
psql -l | grep dss_ferroviaria

# Reiniciar backend
pkill -f "node.*index.js"
cd dss-ferroviaria-backend && NODE_USE_SYSTEM_CA=1 node src/index.js

# Reiniciar frontend
cd dss-ferroviaria-frontend && npm run dev
```

---

## Integración de Todos los Módulos

| Módulo | Ruta | Estado | Vinculado con |
|---|---|---|---|
| Autenticación JWT | `POST /api/auth/login` | ✅ | Todos los módulos protegidos |
| Gestión de usuarios (RBAC) | `GET/POST/PUT/DELETE /api/usuarios` | ✅ | Roles, permisos, Redis cache |
| Catálogo público | `GET /api/public/viajes` | ✅ | ComprarPasaje (sin registro) |
| Compra sin registro | `POST /api/public/compras` | ✅ | Pasarela de pagos |
| Pasarela de pagos | `POST /api/public/pagos` | ✅ | QR + Transferencia + Ventanilla |
| Ventas internas | `POST /api/ventas` | ✅ | Operadores con permiso |
| Pagos internos | `POST /api/pagos` | ✅ | Ventas, reservas |
| Reportes (Query A/B/C) | `GET /api/reportes/*` | ✅ | Dashboard, permisos |
| **Dashboard KPIs** | **`GET /api/dashboard/kpis`** | ✅ | Todos los módulos + DW |
| ETL Data Warehouse | `POST /api/admin/etl/ejecutar` | ✅ | metrica_ocupacion, metrica_combustible |
| Predicción IA | `GET /api/reportes/prediccion-demanda` | ✅ | FastAPI + TensorFlow |
| Monitoreo | `GET /metrics` | ✅ | Prometheus + Grafana |
| App móvil | Expo SDK 54 | ✅ | Backend vía LAN IP |

---

## Despliegue en Localhost (Documentado)

```
┌─────────────────────────────────────────────────────────────┐
│                   Entorno de Pruebas                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend    →  http://localhost:5173      (Vite dev)       │
│  Backend     →  http://localhost:3000      (Node.js)        │
│  Backend #2  →  http://localhost:3001      (LB round-robin) │
│  Nginx HTTPS →  https://localhost:8443     (TLS self-signed)│
│  PostgreSQL  →  localhost:5432  DB=dss_ferroviaria          │
│  Redis       →  localhost:6379  (cache permisos TTL 5min)   │
│  FastAPI IA  →  http://localhost:8500      (TensorFlow)     │
│  Prometheus  →  http://localhost:9090                       │
│  Grafana     →  http://localhost:3030                       │
└─────────────────────────────────────────────────────────────┘
```

**Comando de inicio del sistema completo:**
```bash
# Servicios base
brew services start postgresql@16
brew services start redis
brew services start nginx
brew services start prometheus

# Backend (instancia 1)
cd dss-ferroviaria-backend && NODE_USE_SYSTEM_CA=1 node src/index.js &

# Backend (instancia 2 para load balancing)
PORT=3001 cd dss-ferroviaria-backend && NODE_USE_SYSTEM_CA=1 node src/index.js &

# Frontend
cd dss-ferroviaria-frontend && npm run dev &

# Servidor IA
cd dss-ferroviaria-ia && source venv/bin/activate && uvicorn servidor_ia:app --port 8500 &
```

---

## Checklist Final — Actividad 7

- [x] Paso 1: Librería recharts instalada y funcionando (5 tipos de gráficos)
- [x] Paso 2: `GET /api/dashboard/kpis` — 8 KPIs + 5 series en una consulta
- [x] Paso 3: Gráficos de barras, líneas y pie chart en el dashboard
- [x] Paso 4: Filtros dinámicos por fecha con recarga de gráficos
- [x] Paso 5: 10 casos de prueba de integración documentados (todos PASS)
- [x] Paso 6: Usuario `admin@demo.com` creado, datos cargados, flujo verificado

**Criterio de verificación #2 — Cumplido.**
