-- ============================================
-- SCRIPT: Envío de Carga (transporte de mercancía)
-- Depende de: 00 (dw.viaje, dw.wagon_carga), 01 (dw.roles, dw.permisos)
-- ============================================

-- ============================================
-- 1. TABLA: envio_carga
-- ============================================
CREATE TABLE IF NOT EXISTS dw.envio_carga (
    id_envio SERIAL PRIMARY KEY,
    codigo_envio VARCHAR(20) UNIQUE NOT NULL,
    remitente VARCHAR(150) NOT NULL,
    destinatario VARCHAR(150) NOT NULL,
    peso_kg DECIMAL(10,2) NOT NULL CHECK (peso_kg > 0),
    descripcion_carga TEXT,
    estado_envio VARCHAR(50) NOT NULL DEFAULT 'registrado', -- registrado, en_transito, entregado, cancelado
    id_viaje INT NOT NULL,
    id_wagon_carga INT NOT NULL,
    id_usuario INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viaje) REFERENCES dw.viaje(id_viaje),
    FOREIGN KEY (id_wagon_carga) REFERENCES dw.wagon_carga(id_wagon),
    FOREIGN KEY (id_usuario) REFERENCES dw.usuarios(id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_envio_carga_viaje ON dw.envio_carga(id_viaje);
CREATE INDEX IF NOT EXISTS idx_envio_carga_wagon ON dw.envio_carga(id_wagon_carga);

-- ============================================
-- 2. PERMISOS NUEVOS
-- ============================================
INSERT INTO dw.permisos (nombre, modulo, accion, descripcion)
VALUES
    ('operaciones:crear_envio', 'operaciones', 'crear', 'Registrar un envío de carga'),
    ('reportes:carga', 'reportes', 'leer', 'Ver envíos de carga y su estado')
ON CONFLICT (nombre) DO NOTHING;

-- Administrador: acceso total (mismo criterio que 01-auth-schema.sql)
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'administrador'
  AND p.nombre IN ('operaciones:crear_envio', 'reportes:carga')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Gerente: solo lectura de reportes de carga
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'gerente'
  AND p.nombre = 'reportes:carga'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Operador: registra envíos en estación (igual que ventas)
INSERT INTO dw.roles_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM dw.roles r, dw.permisos p
WHERE r.nombre = 'operador'
  AND p.nombre IN ('operaciones:crear_envio', 'reportes:carga')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;
