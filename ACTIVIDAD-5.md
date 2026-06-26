# Actividad 5 — Sprint 1: Módulo de Autenticación, Roles y Base de Datos Relacional

**Proyecto:** DSS Ferroviaria Oriental S.A.
**Repositorio:** https://github.com/Angellec21/sis321-ferroviaria-oriental-grupo2
**Estado:** ✅ Completado (con 2 desviaciones documentadas frente al enunciado original, ver sección 9)

---

## 0. Objetivo del Sprint

Desarrollar el núcleo técnico del sistema: base de datos relacional normalizada,
módulo de autenticación (registro, login, recuperación de contraseña) y sistema
de roles (administrador, gerente, operador), sobre el scaffolding del stack
elegido.

---

## Paso 1 — Stack Tecnológico

**Elegido:** Variante propia entre la Opción B y C — **Node.js + Express + PostgreSQL**
(no MySQL como pedía la Opción C literal).

| | Opción A | Opción B | Opción C | **Usado** |
|---|---|---|---|---|
| Backend | PHP 8.x + Laravel 11 | Python + Django | Node.js + Express | **Node.js + Express** |
| BD | MySQL (XAMPP) | PostgreSQL | MySQL | **PostgreSQL 16** |

**Por qué la desviación:** el MER de la Actividad 3 ya estaba diseñado y probado
sobre PostgreSQL (tipos de datos, `CHECK` constraints, índices parciales)
antes de iniciar este sprint. Migrar a MySQL hubiera implicado rehacer ese
trabajo sin beneficio real. Justificado en `backend/README.md`.

**Herramientas:** Visual Studio Code (sin extensión REST Client; se usó
`curl` + Postman para probar la API).

---

## Paso 2 — Base de Datos

**Herramienta usada:** `psql` (CLI) en vez de MySQL Workbench (no aplica,
es para MySQL). El diseño visual del MER ya existía de la Actividad 3.

**Normalización 3FN aplicada:**
- 1FN: todos los atributos son atómicos (sin grupos repetidos)
- 2FN: separación de entidades por dependencia funcional completa
  (ej. `pago` separado de `pago_qr`/`pago_transferencia`/`pago_ventanilla`
  por especialización, en vez de columnas nulas mezcladas)
- 3FN: sin dependencias transitivas (ej. `estacion_nombre` no se guarda en
  `usuarios`, se obtiene vía `JOIN` con `id_estacion`)

**Esquema:** `dw` (Data Warehouse), 23+ tablas. Tablas específicas de este
sprint (autenticación/roles):

| Tabla | Columnas clave | Constraint |
|---|---|---|
| `dw.roles` | `id_rol`, `nombre`, `nivel_acceso` | `UNIQUE(nombre)` |
| `dw.permisos` | `id_permiso`, `nombre`, `modulo`, `accion` | `UNIQUE(nombre)` |
| `dw.roles_permisos` | `id_rol`, `id_permiso` (M:M) | `UNIQUE(id_rol, id_permiso)`, 2 FK |
| `dw.usuarios` | `id_usuario`, `email`, `password_hash`, `id_rol`, `reset_token`, `reset_token_expira` | `UNIQUE(email)`, FK a `roles`/`estacion` |
| `dw.refresh_tokens` | `id_token`, `id_usuario`, `token`, `revoked`, `expires_at` | `UNIQUE(token)`, FK a `usuarios` |
| `dw.audit_logs` | `id_log`, `id_usuario`, `tipo_evento`, `detalles` (JSONB) | FK a `usuarios` |

**Script:** `backend/database/01-auth-schema.sql` — `CREATE TABLE` con
`FOREIGN KEY`, `UNIQUE`, `DEFAULT`, índices (`idx_usuarios_email`, etc.).

**Estado real en BD (verificado):**
- Roles: 3 (`administrador`, `gerente`, `operador`)
- Permisos: 18
- Relaciones roles↔permisos: 30
- Usuarios: 22

---

## Paso 3 — Datos de Prueba

**Pedido:** Mockaroo.com (nombres en español, ciudades LATAM, monedas locales).

**Lo que se hizo:**
- `backend/database/seed.js` — 8 usuarios escritos a mano (nombres en
  español, ciudades de Bolivia)
- `backend/database/mockaroo-usuarios.csv` + `import-mockaroo.js` — 12
  usuarios adicionales **con el mismo formato que exporta Mockaroo**, pero
  construidos a mano

**Desviación documentada:** no se usó la cuenta real de mockaroo.com (no se
disponía de acceso durante el desarrollo). El CSV replica su estructura
exacta (columnas, tipo de datos) para cumplir el mismo propósito —datos de
prueba realistas en español/LATAM— sin depender del servicio externo.

**Localización de datos:** Bolivia (Santa Cruz de la Sierra y red real de
Ferroviaria Oriental S.A.: Montero, Warnes, Yacuiba, Puerto Quijarro, Roboré).
Moneda: Bolivianos (Bs). Dominio de correo: `@ferroviariaoriental.com.bo`.

---

## Paso 4 — Autenticación con JWT

**Dependencias instaladas:** `jsonwebtoken`, `bcrypt`, `express-validator`
(exactamente las pedidas, vía `npm install`).

| Requisito | Implementado en | Detalle |
|---|---|---|
| Middleware de autenticación | `backend/src/middleware/auth.js` → `authenticateToken` | Verifica `Authorization: Bearer <token>`, carga usuario+permisos |
| Hash con bcrypt (10 rounds) | `backend/src/models/Usuario.js` | `bcrypt.hash(password, 10)` en registro y cambio de contraseña |
| JWT con expiración 24h | `backend/src/controllers/authController.js` | `jwt.sign(..., { expiresIn: '24h' })` para el access token |
| **Registro** | `POST /api/auth/registro` | Crea usuario (rol `operador` por defecto) |
| **Login** | `POST /api/auth/login` | Devuelve `accessToken` (24h) + `refreshToken` (7d) |
| **Recuperación de contraseña** | `POST /api/auth/olvide-password` + `POST /api/auth/resetear-password` | Token de un solo uso, expira en 1h, no revela si el email existe |
| Validación de inputs | `backend/src/middleware/validators.js` | `express-validator` en registro/login/recuperación/creación de usuario |

**Seguridad adicional implementada (no pedida explícitamente, pero
consistente con el objetivo):**
- Bloqueo de cuenta tras 5 intentos fallidos (15 min)
- `refresh_token` revocable en BD (logout real, no solo del lado cliente)
- `jti` (UUID) en el refresh token para evitar colisiones si dos logins
  ocurren en el mismo segundo (bug real encontrado y corregido durante
  pruebas de carga con el balanceador)
- Auditoría de eventos (`audit_logs`): login exitoso/fallido, registro,
  solicitud de recuperación

**Credenciales de prueba:** ver `backend/USUARIOS.md` (22 usuarios, 2
administradores, 7 gerentes, 13 operadores).

---

## Paso 5 — Sistema de Roles y Permisos

**Tablas** (igual a lo pedido, con columnas adicionales):

```sql
CREATE TABLE dw.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    nivel_acceso INT DEFAULT 0  -- 0=operador, 1=gerente, 2=admin
);

CREATE TABLE dw.permisos (
    id_permiso SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    modulo VARCHAR(50) NOT NULL,   -- 'usuarios', 'reportes', 'operaciones', 'system'
    accion VARCHAR(50) NOT NULL    -- 'crear', 'leer', 'editar', 'eliminar'
);

CREATE TABLE dw.roles_permisos (
    id_rol INT REFERENCES dw.roles(id_rol),
    id_permiso INT REFERENCES dw.permisos(id_permiso),
    UNIQUE(id_rol, id_permiso)
);
```

**Middleware que valida token Y rol antes de cada endpoint**
(`backend/src/middleware/auth.js`):

```javascript
export const requireRole = (rolesPermitidos) => (req, res, next) => {
  if (!rolesPermitidos.includes(req.usuario.rol_nombre)) {
    return res.status(403).json({ code: 'INSUFFICIENT_ROLE' });
  }
  next();
};

export const requirePermission = (permisosRequeridos) => (req, res, next) => {
  const tienePermiso = permisosRequeridos.some((p) => req.usuario.permisos.includes(p));
  if (!tienePermiso) {
    return res.status(403).json({ code: 'INSUFFICIENT_PERMISSION' });
  }
  next();
};
```

Cada ruta protegida usa `authenticateToken` (token) + `requirePermission`/
`requireRole` (rol/permiso) en cadena, ej.:
```javascript
router.get('/', requirePermission(['usuarios:leer']), ...)
router.delete('/:id', requireRole(['administrador']), ...)
```

**Matriz de permisos por rol (resumen):**

| Rol | Permisos |
|---|---|
| **Administrador** | Todos (usuarios, roles, reportes, operaciones, sistema) — 18/18 |
| **Gerente** | Lectura/edición de reportes, operaciones, usuarios |
| **Operador** | Crear venta, crear reserva, crear pago, ver dashboard |

**Caché de permisos (mejora adicional):** los permisos por rol se cachean en
Redis (TTL 5 min) para no consultar Postgres en cada request — verificable
con el header `X-Permisos-Cache: HIT/MISS`.

---

## Paso 6 — GitHub

**Repositorio:** https://github.com/Angellec21/sis321-ferroviaria-oriental-grupo2
(nombre exacto al formato pedido: `sis321-[pyme]-[grupo]`).

**Estado:**
- Público
- 35 commits con mensajes convencionales (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)
- Ejemplos reales de commits:
  - `feat: implementar modulo de autenticacion JWT con bcrypt y recuperacion de contraseña`
  - `feat: sistema de roles y permisos (RBAC) con gestion de usuarios`
  - `fix: refreshToken JWT podia duplicarse con logins simultaneos`

**Desviación documentada:** se usó la terminal (`git` + `gh` CLI) en vez de
GitHub Desktop. Funcionalmente equivalente; se eligió por ser más rápido de
automatizar.

**Estructura del repo (monorepo):** el repo creció más allá de este sprint
(incluye `frontend/`, `ia/`, `mobile/` de actividades posteriores), pero
todo el trabajo de la Actividad 5 vive en `backend/`:

```
sis321-ferroviaria-oriental-grupo2/
└── backend/
    ├── database/
    │   ├── 01-auth-schema.sql
    │   ├── init.js
    │   ├── seed.js
    │   ├── import-mockaroo.js
    │   └── mockaroo-usuarios.csv
    ├── src/
    │   ├── controllers/authController.js
    │   ├── middleware/auth.js, validators.js
    │   ├── models/Usuario.js
    │   └── routes/authRoutes.js, usuariosRoutes.js
    ├── postman/DSS-Ferroviaria-Collection.json
    ├── USUARIOS.md
    ├── README.md / SETUP.md / GITHUB.md
    ├── SPRINT-REVIEW.md
    └── RETROSPECTIVE.md
```

---

## Paso 7 — Sprint Review (Demo de 10 minutos)

**Documento:** `backend/SPRINT-REVIEW.md` — guion completo minuto a minuto.

**Estructura de la demo:**

| Tiempo | Contenido |
|---|---|
| 0:00–1:00 | Introducción al stack y características |
| 1:00–2:30 | Login en Postman → JWT + permisos en la respuesta |
| 2:30–4:00 | Mostrar `01-auth-schema.sql` (estructura de roles/permisos) |
| 4:00–6:00 | Listar usuarios (paginado, autenticado) |
| 6:00–8:00 | Crear nuevo usuario / código de `registro` |
| 8:00–8:45 | Acceso según rol (`requirePermission` en vivo) |
| 8:45–9:30 | Recuperación de contraseña (`olvide-password` → `resetear-password`) |
| 9:30–10:00 | Cierre: repo en GitHub, estructura de carpetas |

**Colección Postman:** `backend/postman/DSS-Ferroviaria-Collection.json` —
incluye carpeta "Autenticación" con Registro, Login (guarda tokens
automático), Renovar Token, Logout, y carpeta "Gestión de Usuarios" con los
6 endpoints CRUD.

---

## Paso 8 — Retrospectiva (Start / Stop / Continue)

**Documento:** `backend/RETROSPECTIVE.md`.

### 🚀 START (completado *dentro* de este mismo ciclo extendido, no quedó para "después")
- ~~Sistema de Reportes~~ → ✅ hecho (Query A/B/C)
- ~~Módulo de Ventas~~ → ✅ hecho
- ~~Módulo de Pagos~~ → ✅ hecho + Pasarela de Pagos simulada

### ⏹️ STOP
- ⚠️ Contraseña default `admin123` en producción → cambiar en despliegue real
- ⚠️ Sin rate limiting (`express-rate-limit` pendiente)
- ⚠️ Logging simple (`console.log`) → considerar Winston/Pino

### ✅ CONTINUE
- Versionamiento con commits descriptivos
- Documentación exhaustiva por módulo
- Seguridad desde el día 1 (bcrypt, JWT, auditoría)
- Testing manual con Postman antes de cada entrega

### Métricas del sprint
```
Entregables completados: 8/8 pasos del enunciado
Bugs reales encontrados y corregidos: 3
  1. authenticateToken duplicado en usuariosRoutes (doble query por request)
  2. refreshToken colisionaba con logins simultaneos (faltaba jti)
  3. Hash bcrypt del admin no correspondía a la contraseña documentada
Cobertura de prueba: manual (Postman + curl), sin tests automatizados aun
```

---

## 9. Resumen de Desviaciones (transparencia)

| # | Desviación | Razón | Impacto |
|---|---|---|---|
| 1 | PostgreSQL en vez de MySQL | MER ya diseñado/probado en Postgres desde Actividad 3 | Ninguno funcional; documentado en README |
| 2 | Mockaroo simulado a mano, no la web real | Sin acceso a cuenta mockaroo.com durante desarrollo | Mismo resultado (datos LATAM realistas), distinto método |
| 3 | `gh`/`git` CLI en vez de GitHub Desktop | Automatización más rápida | Ninguno; mismo resultado final en GitHub |

Ninguna desviación afecta el cumplimiento de los objetivos de aprendizaje del
sprint (JWT, roles, BD relacional, Git) — son decisiones de herramienta, no
de alcance.

---

## 10. Checklist Final

- [x] Paso 1: Stack elegido y justificado
- [x] Paso 2: BD normalizada 3FN con `CREATE TABLE` + constraints
- [x] Paso 3: Datos de prueba LATAM (español, Bolivia, Bs)
- [x] Paso 4: JWT + bcrypt + express-validator + recuperación de contraseña
- [x] Paso 5: Roles + permisos + middleware de autorización
- [x] Paso 6: Repo en GitHub con nombre correcto y commits descriptivos
- [x] Paso 7: Guion de Sprint Review (10 min) + colección Postman
- [x] Paso 8: Retrospectiva Start/Stop/Continue documentada

**Criterio de verificación #2 — Cumplido.**
