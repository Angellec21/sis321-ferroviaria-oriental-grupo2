-- ============================================
-- SCRIPT DE INICIALIZACIÓN: AUTENTICACIÓN Y ROLES
-- Base de Datos: dss_ferroviaria (PostgreSQL 16)
-- Esquema: dw (del MER de Actividad 3)
-- ============================================

-- Conectar a la BD: psql -U postgres -d dss_ferroviaria

-- ============================================
-- 1. TABLA: roles
-- ============================================
CREATE TABLE IF NOT EXISTS dw.roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    nivel_acceso INT DEFAULT 0, -- 0=operador, 1=gerente, 2=admin
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles predefinidos
INSERT INTO dw.roles (nombre, descripcion, nivel_acceso, estado)
VALUES 
    ('administrador', 'Administrador del sistema con acceso total', 2, TRUE),
    ('gerente', 'Gerente con permisos de reportes y decisiones', 1, TRUE),
    ('operador', 'Operador de estación con permisos limitados', 0, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 2. TABLA: permisos
-- ============================================
CREATE TABLE IF NOT EXISTS dw.permisos (
    id_permiso SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    modulo VARCHAR(50) NOT NULL, -- 'usuarios', 'reportes', 'operaciones', 'system'
    accion VARCHAR(50) NOT NULL, -- 'crear', 'leer', 'editar', 'eliminar'
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar permisos predefinidos
INSERT INTO dw.permisos (nombre, modulo, accion, descripcion)
VALUES 
    -- Gestión de usuarios
    ('usuarios:crear', 'usuarios', 'crear', 'Crear nuevo usuario'),
    ('usuarios:leer', 'usuarios', 'leer', 'Listar y ver usuarios'),
    ('usuarios:editar', 'usuarios', 'editar', 'Editar datos de usuario'),
    ('usuarios:eliminar', 'usuarios', 'eliminar', 'Eliminar usuario'),
    ('usuarios:resetear_password', 'usuarios', 'editar', 'Resetear contraseña'),
    
    -- Gestión de roles y permisos
    ('roles:crear', 'system', 'crear', 'Crear roles'),
    ('roles:leer', 'system', 'leer', 'Ver roles'),
    ('roles:editar', 'system', 'editar', 'Editar roles'),
    ('roles:eliminar', 'system', 'eliminar', 'Eliminar roles'),
    
    -- Reportes
    ('reportes:ingresos', 'reportes', 'leer', 'Ver reporte de ingresos (Query A)'),
    ('reportes:ocupacion', 'reportes', 'leer', 'Ver reporte de ocupación (Query B)'),
    ('reportes:mantenimiento', 'reportes', 'leer', 'Ver reporte de mantenimiento (Query C)'),
    
    -- Operaciones
    ('operaciones:crear_venta', 'operaciones', 'crear', 'Crear venta'),
    ('operaciones:crear_reserva', 'operaciones', 'crear', 'Crear reserva'),
    ('operaciones:crear_pago', 'operaciones', 'crear', 'Registrar pago'),
    ('operaciones:ver_dashboard', 'operaciones', 'leer', 'Ver dashboard operacional'),
    
    -- System
    ('system:ver_logs', 'system', 'leer', 'Ver logs del sistema'),
    ('system:respaldar_bd', 'system', 'crear', 'Realizar backup de BD')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 3. TABLA: roles_permisos (Relación M:M)
-- ============================================
CREATE TABLE IF NOT EXISTS dw.roles_permisos (
    id_rol_permiso SERIAL PRIMARY KEY,
    id_rol INT NOT NULL,
    id_permiso INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_rol, id_permiso),
    FOREIGN KEY (id_rol) REFERENCES dw.roles(id_rol) ON DELETE CASCADE,
    FOREIGN KEY (id_permiso) REFERENCES dw.permisos(id_permiso) ON DELETE CASCADE
);

-- ============================================
-- 4. ASIGNAR PERMISOS A ROLES
-- ============================================

-- ADMINISTRADOR: Todos los permisos
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'administrador'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- GERENTE: Permisos de lectura general + reportes
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'gerente'
  AND p.accion IN ('leer', 'editar')
  AND p.modulo IN ('reportes', 'operaciones', 'usuarios')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- OPERADOR: Permisos limitados de operación
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'operador'
  AND p.nombre IN (
    'operaciones:crear_venta',
    'operaciones:crear_reserva',
    'operaciones:crear_pago',
    'operaciones:ver_dashboard',
    'usuarios:leer'
  )
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- ============================================
-- 5. TABLA: usuarios (Extender la existente del MER)
-- ============================================
-- Si la tabla usuario_venta ya existe, agregamos columnas de autenticación
-- Si no existe, la creamos completa

-- Crear tabla completa de usuarios si no existe
CREATE TABLE IF NOT EXISTS dw.usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    documento_identidad VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    id_rol INT NOT NULL DEFAULT 3, -- Por defecto 'operador'
    id_estacion INT,
    telefono VARCHAR(20),
    estado BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP,
    intentos_fallidos INT DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    reset_token VARCHAR(255), -- token para recuperación de contraseña ("olvidé mi contraseña")
    reset_token_expira TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES dw.roles(id_rol),
    FOREIGN KEY (id_estacion) REFERENCES dw.estacion(id_estacion)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON dw.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON dw.usuarios(id_rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estacion ON dw.usuarios(id_estacion);

-- ============================================
-- 6. TABLA: refresh_tokens (Para sesiones)
-- ============================================
CREATE TABLE IF NOT EXISTS dw.refresh_tokens (
    id_token SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES dw.usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON dw.refresh_tokens(id_usuario);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON dw.refresh_tokens(token);

-- ============================================
-- 7. TABLA: audit_logs (Trazabilidad)
-- ============================================
CREATE TABLE IF NOT EXISTS dw.audit_logs (
    id_log SERIAL PRIMARY KEY,
    id_usuario INT,
    tipo_evento VARCHAR(100), -- 'login', 'logout', 'crear_usuario', 'editar_rol', etc.
    modulo VARCHAR(50),
    accion VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    detalles JSONB,
    estado VARCHAR(50), -- 'exitoso', 'fallido'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES dw.usuarios(id_usuario) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON dw.audit_logs(id_usuario);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tipo ON dw.audit_logs(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha ON dw.audit_logs(created_at);

-- ============================================
-- 8. INSERTAR USUARIO ADMINISTRATIVO POR DEFECTO
-- ============================================
-- Contraseña por defecto (DEBE CAMBIAR EN PRIMERA SESIÓN): admin123
-- Hash bcrypt generado con: bcrypt('admin123', 10)

INSERT INTO dw.usuarios (nombre, email, documento_identidad, password_hash, id_rol, estado)
VALUES (
    'Administrador Sistema',
    'admin@ferroviariaoriental.com.bo',
    '4521678',
    '$2b$10$Z7GnoQiF1wyc4SakThCBceZU6eZAfTWKXw/YZ1EFa2UcTxZ0XOHSK', -- bcrypt('admin123', 10)
    1, -- id_rol = administrador
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 9. VERIFICACIÓN FINAL
-- ============================================
-- Ejecutar estas queries para verificar

-- Ver todos los roles
SELECT * FROM dw.roles;

-- Ver todos los permisos
SELECT * FROM dw.permisos;

-- Ver matriz de roles-permisos
SELECT r.nombre as rol, p.nombre as permiso
FROM dw.roles_permisos rp
JOIN dw.roles r ON rp.id_rol = r.id_rol
JOIN dw.permisos p ON rp.id_permiso = p.id_permiso
ORDER BY r.nombre, p.nombre;

-- Ver usuario administrador
SELECT id_usuario, nombre, email, id_rol FROM dw.usuarios WHERE email = 'admin@ferroviariaoriental.com.bo';

COMMIT;
