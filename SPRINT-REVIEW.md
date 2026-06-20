# 🎬 Script de Demo - Sprint Review (10 minutos)

**Objetivo:** Demostrar funcionalidad de autenticación, roles y permisos

---

## Antes de Empezar

✅ Servidor corriendo: `npm run dev`  
✅ Postman abierto con colección importada  
✅ Proyecto GitHub creado  

---

## ⏱️ DEMO (10 minutos)

### [0:00-1:00] Introducción

**Slides/Verbal:**
```
"Este sprint hemos implementado el backend con autenticación JWT
basada en el diagrama de despliegue. Stack: Node.js + Express + PostgreSQL.

Características:
• Sistema de autenticación JWT (24h) + refresh token (7 días)
• 3 roles: Administrador, Gerente, Operador
• 19 permisos granulares
• Hash seguro de contraseñas con bcrypt (10 rounds)
• Auditoría de eventos
• Bloqueo automático después de 5 intentos fallidos
"
```

---

### [1:00-2:30] Demostración de Login

**Pantalla:** Postman

1. Click en carpeta **"Autenticación"** → **"Login"**

2. Body muestra:
   ```json
   {
     "email": "admin@ferroviaria.com.co",
     "password": "admin123"
   }
   ```

3. Click **Send**

4. **Mostrar Respuesta:**
   ```json
   {
     "success": true,
     "data": {
       "id_usuario": 1,
       "nombre": "Administrador Sistema",
       "email": "admin@ferroviaria.com.co",
       "rol": "administrador",
       "permisos": [
         "usuarios:crear",
         "usuarios:leer",
         "usuarios:editar",
         "usuarios:eliminar",
         ...más permisos
       ]
     },
     "tokens": {
       "accessToken": "eyJhbGc...",
       "refreshToken": "eyJhbGc..."
     }
   }
   ```

**Destacar:**
- ✅ JWT con información de usuario
- ✅ Permisos cargados dinámicamente
- ✅ Token guardado automáticamente en variable de Postman

---

### [2:30-4:00] Ver Rol y Permisos

**Panel de Pantalla: Mostrar archivo**

Abrir `database/01-auth-schema.sql` en VS Code

**Señalar:**

1. **Estructura de Roles:**
   ```sql
   CREATE TABLE dw.roles (
       id_rol SERIAL PRIMARY KEY,
       nombre VARCHAR(50) UNIQUE NOT NULL,
       nivel_acceso INT DEFAULT 0, -- 0=operador, 1=gerente, 2=admin
   ```
   - Nivel de acceso numérico para jerarquía

2. **Matriz de Permisos:**
   ```sql
   INSERT INTO dw.roles_permisos (id_rol, id_permiso)
   SELECT r.id_rol, p.id_permiso
   FROM dw.roles r, dw.permisos p
   WHERE r.nombre = 'administrador'
   ```
   - Todos los permisos para admin
   - Permisos limitados para gerente y operador

---

### [4:00-6:00] Listar Usuarios

**Volver a Postman**

1. Click en **"Gestión de Usuarios"** → **"Listar Usuarios"**

2. Header automáticamente tiene:
   ```
   Authorization: Bearer {{access_token}}
   ```

3. Click **Send**

4. **Mostrar Respuesta:**
   ```json
   {
     "success": true,
     "data": [
       {
         "id_usuario": 1,
         "nombre": "Administrador Sistema",
         "email": "admin@ferroviaria.com.co",
         "id_rol": 1,
         "rol_nombre": "administrador",
         "estado": true
       }
     ],
     "pagination": {
       "page": 1,
       "limit": 10,
       "total": 1,
       "pages": 1
     }
   }
   ```

**Destacar:**
- ✅ Auth middleware validó token
- ✅ Permisos verificados (usuarios:leer)
- ✅ Paginación incluida

---

### [6:00-8:00] Crear Nuevo Usuario

**En Postman (OPCIONAL si tiempo):**

1. **POST /api/auth/registro**
2. Body:
   ```json
   {
     "nombre": "Carlos Gómez",
     "email": "carlos@ferroviaria.com.co",
     "documento_identidad": "98765432",
     "password": "Pass1234!",
     "id_estacion": 1
   }
   ```
3. Send → Mostrar respuesta con token

**O Alternativamente:**

Mostrar el código en VS Code:

Abrir `src/controllers/authController.js` → función `registro`:
```javascript
export const registro = async (req, res) => {
  // Validaciones
  // Hash de password
  // Crear usuario
  // Generar JWT
  // Log de auditoría
}
```

---

### [8:00-9:30] Acceso según Rol

**Mostrar en VS Code:**

Abrir `src/middleware/auth.js`:

```javascript
/**
 * Middleware: Verificar permiso específico
 */
export const requirePermission = (permisosRequeridos) => {
  return (req, res, next) => {
    if (!req.usuario.permisos.includes(p)) {
      return res.status(403).json({
        success: false,
        message: 'Permiso insuficiente',
        code: 'INSUFFICIENT_PERMISSION'
      });
    }
  };
};
```

**Explicar:**
- Operador SIN permiso `usuarios:crear` → Error 403
- Gerente con permiso `reportes:leer` → Acceso ✅
- Admin con todos los permisos → Acceso total

---

### [9:30-10:00] Cierre y GitHub

**Mostrar:**

1. GitHub repo creado:
   ```
   https://github.com/[usuario]/sis321-ferroviaria-grupo1
   ```

2. Commits visibles:
   ```
   ✅ feat: inicializar proyecto backend
   ✅ feat: implementar autenticación JWT
   ✅ feat: agregar sistema de roles
   ```

3. Structure:
   ```
   ├── src/
   │   ├── controllers/
   │   ├── middleware/
   │   ├── models/
   │   └── routes/
   ├── database/
   ├── postman/
   └── README.md
   ```

---

## 📊 Palabras Clave para la Demo

- ✅ "Autenticación segura con JWT"
- ✅ "Contraseñas hasheadas con bcrypt"
- ✅ "Sistema de roles y permisos flexible"
- ✅ "Auditoría de eventos"
- ✅ "Alineado con diagrama de despliegue"
- ✅ "Listo para integración con frontend"
- ✅ "Código en GitHub con versionamiento"

---

## 🎤 Preguntas Esperadas (y Respuestas)

### P: "¿Qué pasa si alguien intenta acceder sin token?"

R: El middleware `authenticateToken` lo rechaza con 401 Unauthorized.

```javascript
if (!token) {
  return res.status(401).json({
    message: 'Token no proporcionado'
  });
}
```

### P: "¿Dónde se almacenan las contraseñas?"

R: Hasheadas con bcrypt en la columna `password_hash` de `dw.usuarios`. Nunca en texto plano.

### P: "¿Cómo se integra con el frontend?"

R: El frontend hace POST a `/api/auth/login`, recibe token JWT y lo envía en header `Authorization: Bearer {token}` en cada request.

### P: "¿Cuánto tiempo expira el token?"

R: 24 horas. El frontend puede usar refresh token para renovarlo por 7 más.

### P: "¿Qué pasa si alguien intenta fuerza bruta?"

R: Después de 5 intentos fallidos, la cuenta se bloquea 15 minutos automáticamente.

---

## 📁 Archivos a Mostrar

```
dss-ferroviaria-backend/
├── ✅ SETUP.md              → Cómo instalar
├── ✅ README.md             → Documentación completa
├── ✅ GITHUB.md             → Guía de commits
├── ✅ src/index.js          → App principal
├── ✅ src/middleware/auth.js → JWT + Roles
├── ✅ database/01-auth-schema.sql → Tablas
└── ✅ postman/DSS-Ferroviaria-Collection.json → Requests
```

---

## 🏆 Criterios de Éxito

- [ ] Login funciona y retorna JWT
- [ ] Permisos se validan correctamente
- [ ] Usuarios pueden ser creados/editados/eliminados
- [ ] Cambio de contraseña funciona
- [ ] Código en GitHub con commits descriptivos
- [ ] README claro y completo
- [ ] Postman collection actualizada
- [ ] Demo dura exactamente 10 minutos

---

## ⏮️ Al Terminar

```bash
# Parar servidor
Ctrl + C

# Agregar cambios
git add .
git commit -m "docs: agregar demo para sprint review"
git push origin main

# En Trello/Jira: Marcar como DONE
```

---

**¡Éxito en tu presentación!** 🚀
