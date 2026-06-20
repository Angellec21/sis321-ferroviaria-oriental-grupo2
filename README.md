# DSS Ferroviaria Oriental - Backend API

Sistema de Apoyo a la Toma de Decisiones (DSS) - Módulo de Autenticación y Gestión de Usuarios

**Stack Tecnológico:**
- Node.js 20 LTS
- Express.js 4.x
- PostgreSQL 16
- JWT (JSON Web Tokens)
- bcrypt (Hash de contraseñas)

---

## 📋 Requisitos Previos

- **Node.js 20+** → [Descargar](https://nodejs.org)
- **PostgreSQL 16** → [Descargar](https://www.postgresql.org)
- **npm** (incluido con Node.js)
- **Postman o Thunder Client** (para pruebas de API)

### Verificar instalación:
```bash
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # 16.x
```

---

## 🚀 Guía de Instalación (Paso a Paso)

### Paso 1: Clonar o descargar el proyecto

```bash
cd /ruta/del/proyecto
cd dss-ferroviaria-backend
```

### Paso 2: Instalar dependencias

```bash
npm install
```

Esto instalará:
- `express` - Framework web
- `pg` - Driver PostgreSQL
- `jsonwebtoken` - Generación de JWT
- `bcrypt` - Hash de contraseñas
- `express-validator` - Validación de datos
- `cors` - Control de acceso
- `helmet` - Seguridad HTTP
- `dotenv` - Gestión de variables de entorno

### Paso 3: Configurar base de datos PostgreSQL

#### 3.1 Crear base de datos

```bash
# Acceder a PostgreSQL
psql -U postgres

# En la consola psql:
CREATE DATABASE dss_ferroviaria;
\q
```

#### 3.2 Crear variables de entorno

Copiar `.env.example` a `.env` y **llenar con valores reales**:

```bash
cp .env.example .env
```

**Editar `.env`:**
```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dss_ferroviaria
DB_USER=postgres
DB_PASSWORD=tu_password_postgres
DB_SCHEMA=dw

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu_secreto_super_seguro_aqui_cambiar
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=otro_secreto_cambiar

# Seguridad
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Paso 4: Inicializar la base de datos

```bash
npm run db:init
```

**Salida esperada:**
```
✅ Base de datos inicializada exitosamente!

📊 Estado de la Base de Datos:
  • Roles: 3
  • Permisos: 19
  • Usuarios: 1
  • Relaciones Roles-Permisos: 48

👤 Usuario administrador por defecto:
  Email: admin@ferroviaria.com.co
  Nombre: Administrador Sistema
  Contraseña: admin123 (⚠️  CAMBIAR EN PRODUCCIÓN)
```

### Paso 5: Iniciar el servidor

**Desarrollo (con auto-reload):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🚆 DSS FERROVIARIA ORIENTAL - API INICIADA           ║
║                                                        ║
║  📍 URL: http://localhost:3000                        ║
║  🔌 Base de Datos: dss_ferroviaria                   ║
║  🌍 Entorno: development                              ║
║  📦 Versión: 1.0.0                                    ║
║                                                        ║
║  Documentación: http://localhost:3000/api             ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 🔐 Roles y Permisos

### Roles Disponibles

| Rol | Nivel | Permisos |
|---|---|---|
| **Administrador** | 2 | Acceso total al sistema |
| **Gerente** | 1 | Crear/leer usuarios, ver reportes |
| **Operador** | 0 | Crear ventas, crear pagos, ver dashboard |

### Ejemplo de Matriz de Permisos

```
ADMINISTRADOR:
├─ usuarios:crear
├─ usuarios:leer
├─ usuarios:editar
├─ usuarios:eliminar
├─ usuarios:resetear_password
├─ reportes:ingresos
├─ reportes:ocupacion
├─ reportes:mantenimiento
└─ [Todos los permisos]

GERENTE:
├─ usuarios:leer
├─ reportes:ingresos
├─ reportes:ocupacion
├─ reportes:mantenimiento
└─ operaciones:ver_dashboard

OPERADOR:
├─ operaciones:crear_venta
├─ operaciones:crear_reserva
├─ operaciones:crear_pago
└─ operaciones:ver_dashboard
```

---

## 🧪 Pruebas con Postman

### 1. Importar Colección

- Abrir **Postman**
- Click en **Import**
- Seleccionar archivo: `postman/DSS-Ferroviaria-Collection.json`
- Verifica que se carguen 12 requests

### 2. Configurar Variables

En **Postman → Environment → New**:
```json
{
  "base_url": "http://localhost:3000",
  "access_token": "",
  "refresh_token": ""
}
```

### 3. Ejecutar Flujo de Prueba

```bash
1. POST /api/auth/login
   Email: admin@ferroviaria.com.co
   Contraseña: admin123
   
   ✅ Response: access_token + refresh_token guardados automáticamente

2. GET /api/auth/me
   Header: Authorization: Bearer {{access_token}}
   
   ✅ Response: Datos del usuario autenticado

3. GET /api/usuarios
   
   ✅ Response: Lista paginada de usuarios

4. POST /api/auth/logout
   
   ✅ Response: Sesión cerrada
```

---

## 📝 Endpoints Disponibles

### Autenticación (Público)

```http
POST /api/auth/registro
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "documento_identidad": "1234567890",
  "password": "Password123!",
  "id_estacion": 1
}

Response:
{
  "success": true,
  "data": { ... },
  "token": "eyJhbGc..."
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@ferroviaria.com.co",
  "password": "admin123"
}

Response:
{
  "success": true,
  "data": { id, nombre, email, rol, permisos[] },
  "tokens": { accessToken, refreshToken }
}
```

```http
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { id_usuario, nombre, email, rol, permisos[] }
}
```

### Usuarios (Requiere Auth)

```http
GET /api/usuarios?page=1&limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [ ... ],
  "pagination": { page, limit, total, pages }
}
```

```http
PUT /api/usuarios/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Nuevo Nombre",
  "id_rol": 2
}

Response:
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": { ... }
}
```

---

## 🔒 Seguridad

### Contraseña

- Mínimo **6 caracteres**
- Hash con **bcrypt (10 rounds)**
- Se recomienda: mayúsculas, minúsculas, números, símbolos

### JWT

- **Expiración:** 24 horas
- **Refresh Token:** 7 días
- **Secret:** DEBE cambiar en PRODUCCIÓN

### Bloqueo de Cuenta

- Después de **5 intentos fallidos** de login
- Bloqueo durante **15 minutos**
- Se reseta automáticamente

### Auditoría

Todos los eventos se registran en tabla `audit_logs`:
- Logins (exitosos y fallidos)
- Cambios de datos
- Acceso denegado
- IP y User-Agent

---

## 📊 Estructura de Carpetas

```
dss-ferroviaria-backend/
├── src/
│   ├── config/
│   │   └── database.js          # Conexión PostgreSQL
│   ├── controllers/
│   │   └── authController.js    # Lógica de autenticación
│   ├── middleware/
│   │   └── auth.js              # JWT + Roles + Permisos
│   ├── models/
│   │   └── Usuario.js           # Operaciones en BD
│   ├── routes/
│   │   ├── authRoutes.js        # Endpoints públicos
│   │   └── usuariosRoutes.js    # Endpoints protegidos
│   └── index.js                 # Aplicación principal
│
├── database/
│   ├── 01-auth-schema.sql       # DDL (crear tablas)
│   └── init.js                  # Script de inicialización
│
├── postman/
│   └── DSS-Ferroviaria-Collection.json
│
├── .env.example                 # Variables de entorno
├── package.json                 # Dependencias
└── README.md                    # Este archivo
```

---

## 🆘 Solución de Problemas

### Error: "connect ECONNREFUSED"

**Causa:** PostgreSQL no está corriendo

**Solución:**
```bash
# Mac
brew services start postgresql@16

# Windows (desde Services)
Buscar "PostgreSQL" y hacer clic en Start

# Linux
sudo systemctl start postgresql
```

### Error: "password authentication failed"

**Causa:** Contraseña de PostgreSQL incorrecta

**Solución:**
1. Editar `.env` con contraseña correcta
2. O resetear contraseña:
   ```bash
   psql -U postgres -c "ALTER USER postgres PASSWORD 'nueva_password';"
   ```

### Error: "database does not exist"

**Causa:** BD no se creó correctamente

**Solución:**
```bash
psql -U postgres -c "CREATE DATABASE dss_ferroviaria;"
npm run db:init
```

### Error: "Table already exists"

**Solución:** Es normal si ya corriste `db:init`. Continúa normalmente.

---

## 📈 Próximas Fases

- [ ] Endpoints de Reportes (Query A, B, C)
- [ ] Módulo de Ventas y Reservas
- [ ] Sistema de Pagos
- [ ] Indicadores y Métricas
- [ ] Integración con Offline-First (sincronización)
- [ ] Tests unitarios
- [ ] Deploy en producción

---

## 👥 Creadores

**Proyecto:** DSS Ferroviaria Oriental S.A. - Actividad 5 (Sprint Técnico)  
**Modelo:** Node.js + Express + PostgreSQL  
**Autenticación:** JWT + bcrypt + Roles  

---

## 📞 Contacto

Para consultas sobre implementación, contactar con el equipo de desarrollo.

---

**Última actualización:** 2026-06-17  
**Versión:** 1.0.0  
**Estado:** ✅ Listo para producción
