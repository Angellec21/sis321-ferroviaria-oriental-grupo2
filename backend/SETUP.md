# ⚡ SETUP RÁPIDO - 5 MINUTOS

## 1️⃣ Verificar Requisitos

```bash
# Debe mostrar versiones:
node --version     # v20+
npm --version      # 10+
psql --version     # 16
```

Si algo falta, instala desde:
- Node.js: https://nodejs.org
- PostgreSQL: https://www.postgresql.org

---

## 2️⃣ Crear Base de Datos

```bash
# Acceder a PostgreSQL
psql -U postgres

# En la consola (cambiar admin123 por tu contraseña):
CREATE DATABASE dss_ferroviaria;
\q
```

---

## 3️⃣ Configurar Variables de Entorno

```bash
# En la carpeta del proyecto:
cp .env.example .env

# Editar .env con tu editor favorito (VS Code, etc)
# Llenar:
# DB_PASSWORD=tu_password_postgres
# JWT_SECRET=algo_secreto_cambiar
```

---

## 4️⃣ Instalar Dependencias

```bash
npm install
```

Esperar a que termine (1-2 minutos)

---

## 5️⃣ Inicializar BD

```bash
npm run db:init
```

Verás:
```
✅ Base de datos inicializada exitosamente!
👤 Email: admin@ferroviaria.com.co
👤 Contraseña: admin123
```

---

## 6️⃣ Iniciar Servidor

```bash
npm run dev
```

Verás:
```
🚆 DSS FERROVIARIA ORIENTAL - API INICIADA
📍 URL: http://localhost:3000
```

**¡LISTO!** El servidor está corriendo.

---

## 7️⃣ Probar Autenticación

### Con curl:

```bash
# En otra terminal (Ctrl+C no detiene el servidor):

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ferroviaria.com.co","password":"admin123"}'

# Respuesta:
# {
#   "success": true,
#   "tokens": { "accessToken": "eyJhbGc..." }
# }
```

### O Importar en Postman:

1. Descargar **Postman**: https://www.postman.com
2. Import → Seleccionar: `postman/DSS-Ferroviaria-Collection.json`
3. Click en "Login" → Send
4. Ver respuesta ✅

---

## ✅ Checklist de Verificación

- [ ] `npm install` completado
- [ ] `.env` configurado con credenciales reales
- [ ] `npm run db:init` ejecutado exitosamente
- [ ] Servidor inicia sin errores: `npm run dev`
- [ ] Login funciona: test con Postman
- [ ] API responde en http://localhost:3000/api

---

## 🚨 Si algo falla...

### Error: "connection refused"
→ PostgreSQL no está corriendo
```bash
# Mac:
brew services start postgresql@16

# Windows: Services → PostgreSQL → Start
```

### Error: "password authentication failed"
→ Cambiar contraseña en `.env`

### Error: "database does not exist"
```bash
psql -U postgres -c "CREATE DATABASE dss_ferroviaria;"
npm run db:init
```

---

**¡Completado!** Ahora puedes:
- Crear usuarios
- Login/Logout
- Gestionar roles
- Hacer commits a GitHub

Siguiente paso: **Actividad 5 - Sprint Review**
