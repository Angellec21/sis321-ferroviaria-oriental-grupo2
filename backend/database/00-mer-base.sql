-- ============================================
-- 0. Esquemas y extensiones
-- ============================================
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS dw;
CREATE SCHEMA IF NOT EXISTS logs;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON SCHEMA dw IS 'Data Warehouse - Tablas normalizadas 3FN para reportes y BI';
COMMENT ON SCHEMA staging IS 'Staging Area - Datos raw de fuentes operacionales (30-90 dias)';

-- ============================================
-- 1.1 TABLA: empresa
-- ============================================
CREATE TABLE IF NOT EXISTS dw.empresa (
    id_empresa SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    nit VARCHAR(20) UNIQUE NOT NULL,
    ciudad_principal VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(150),
    fecha_creacion DATE DEFAULT CURRENT_DATE,
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dw.empresa (nombre, nit, ciudad_principal, email, estado)
VALUES ('Ferroviaria Oriental S.A.', '1020304050', 'Santa Cruz de la Sierra', 'contacto@ferroviariaoriental.com.bo', TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 1.2 TABLA: estacion
-- ============================================
CREATE TABLE IF NOT EXISTS dw.estacion (
    id_estacion SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    conectividad_estado VARCHAR(50) DEFAULT 'intermitente',
    velocidad_conexion_mbps DECIMAL(5,2),
    id_empresa INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES dw.empresa(id_empresa),
    UNIQUE(nombre, id_empresa)
);

INSERT INTO dw.estacion (nombre, ciudad, departamento, latitud, longitud, conectividad_estado, id_empresa)
SELECT * FROM (VALUES
  ('Santa Cruz de la Sierra - Terminal Bimodal', 'Santa Cruz de la Sierra', 'Santa Cruz', -17.7833, -63.1821, 'estable', 1),
  ('Montero', 'Montero', 'Santa Cruz', -17.3333, -63.2500, 'estable', 1),
  ('Warnes', 'Warnes', 'Santa Cruz', -17.5167, -63.1667, 'estable', 1),
  ('Yacuiba - Frontera Argentina', 'Yacuiba', 'Tarija', -21.9667, -63.6500, 'intermitente', 1),
  ('Puerto Quijarro - Frontera Brasil', 'Puerto Quijarro', 'Santa Cruz', -17.7833, -57.7667, 'intermitente', 1),
  ('Robore', 'Robore', 'Santa Cruz', -18.3333, -59.7500, 'intermitente', 1)
) AS v(nombre, ciudad, departamento, latitud, longitud, conectividad_estado, id_empresa)
ON CONFLICT (nombre, id_empresa) DO NOTHING;

-- ============================================
-- 1.3 TABLA: ruta_ferroviaria
-- ============================================
CREATE TABLE IF NOT EXISTS dw.ruta_ferroviaria (
    id_ruta SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    estacion_origen INT NOT NULL,
    estacion_destino INT NOT NULL,
    distancia_km DECIMAL(8,2) NOT NULL,
    duracion_estimada_minutos INT NOT NULL,
    rendimiento_combustible_kml DECIMAL(5,2) NOT NULL,
    tarifa_adulto DECIMAL(10,2),
    tarifa_niño DECIMAL(10,2),
    tarifa_senior DECIMAL(10,2),
    estado_ruta VARCHAR(50) DEFAULT 'activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estacion_origen) REFERENCES dw.estacion(id_estacion),
    FOREIGN KEY (estacion_destino) REFERENCES dw.estacion(id_estacion),
    CHECK (estacion_origen != estacion_destino),
    UNIQUE(estacion_origen, estacion_destino)
);

INSERT INTO dw.ruta_ferroviaria (nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos, rendimiento_combustible_kml, tarifa_adulto, estado_ruta)
SELECT * FROM (VALUES
  ('Santa Cruz - Montero', 1, 2, 52.0, 60, 4.8, 25.0, 'activa'),
  ('Montero - Puerto Quijarro', 2, 5, 590.0, 720, 4.6, 220.0, 'activa'),
  ('Santa Cruz - Yacuiba', 1, 4, 540.0, 660, 4.5, 280.0, 'activa'),
  ('Warnes - Robore', 3, 6, 460.0, 540, 4.2, 190.0, 'activa')
) AS v(nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos, rendimiento_combustible_kml, tarifa_adulto, estado_ruta)
ON CONFLICT (estacion_origen, estacion_destino) DO NOTHING;

-- ============================================
-- 1.4 TABLA: tipo_mantenimiento
-- ============================================
CREATE TABLE IF NOT EXISTS dw.tipo_mantenimiento (
    id_tipo_mant SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    intervalo_viajes INT NOT NULL,
    intervalo_dias INT,
    costo_promedio DECIMAL(10,2) NOT NULL,
    duracion_horas INT DEFAULT 8
);

INSERT INTO dw.tipo_mantenimiento (nombre, descripcion, intervalo_viajes, costo_promedio, duracion_horas)
SELECT * FROM (VALUES
  ('Revision Basica', 'Cambio de aceite, filtros, inspeccion general', 500, 150000.0, 2),
  ('Mantenimiento Preventivo', 'Revision completa, ajuste de frenos, ruedas', 2000, 500000.0, 8),
  ('Revision de Tren Motriz', 'Inspeccion de motor, transmision', 5000, 1200000.0, 16),
  ('Renovacion de Neumaticos', 'Cambio de llantas', 3000, 800000.0, 6)
) AS v(nombre, descripcion, intervalo_viajes, costo_promedio, duracion_horas)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 2.1 TABLA: tren
-- ============================================
CREATE TABLE IF NOT EXISTS dw.tren (
    id_tren SERIAL PRIMARY KEY,
    codigo_tren VARCHAR(20) UNIQUE NOT NULL,
    capacidad_total_pasajeros INT NOT NULL,
    capacidad_total_carga_kg DECIMAL(12,2) NOT NULL,
    año_fabricacion INT NOT NULL CHECK (año_fabricacion >= 1900),
    placa VARCHAR(20) UNIQUE,
    fecha_ultimo_mantenimiento DATE,
    viajes_acumulados INT DEFAULT 0 CHECK (viajes_acumulados >= 0),
    consumo_combustible_acumulado DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'operativo',
    id_empresa INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES dw.empresa(id_empresa)
);

INSERT INTO dw.tren (codigo_tren, capacidad_total_pasajeros, capacidad_total_carga_kg, año_fabricacion, placa, id_empresa, viajes_acumulados)
SELECT * FROM (VALUES
  ('TR-001', 400, 5000.0, 2018, 'FOE-0001', 1, 4850),
  ('TR-002', 380, 4800.0, 2019, 'FOE-0002', 1, 3200),
  ('TR-003', 400, 5000.0, 2020, 'FOE-0003', 1, 2150),
  ('TR-004', 420, 5500.0, 2021, 'FOE-0004', 1, 1800),
  ('TR-005', 400, 5000.0, 2022, 'FOE-0005', 1, 1500)
) AS v(codigo_tren, capacidad_total_pasajeros, capacidad_total_carga_kg, año_fabricacion, placa, id_empresa, viajes_acumulados)
ON CONFLICT (codigo_tren) DO NOTHING;

-- ============================================
-- 2.2 TABLA: wagon
-- ============================================
CREATE TABLE IF NOT EXISTS dw.wagon (
    id_wagon SERIAL PRIMARY KEY,
    codigo_wagon VARCHAR(20) UNIQUE NOT NULL,
    id_tren INT NOT NULL,
    tipo_wagon VARCHAR(50) NOT NULL,
    posicion_tren INT NOT NULL,
    peso_vacio_kg DECIMAL(10,2) NOT NULL,
    fecha_fabricacion DATE,
    estado_wagon VARCHAR(50) DEFAULT 'operativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tren) REFERENCES dw.tren(id_tren),
    UNIQUE(id_tren, posicion_tren),
    CHECK (tipo_wagon IN ('pasajeros', 'carga'))
);

INSERT INTO dw.wagon (codigo_wagon, id_tren, tipo_wagon, posicion_tren, peso_vacio_kg, fecha_fabricacion)
SELECT * FROM (VALUES
  ('WAG-001-P1', 1, 'pasajeros', 1, 15000.0, DATE '2018-01-15'),
  ('WAG-001-P2', 1, 'pasajeros', 2, 15000.0, DATE '2018-01-15'),
  ('WAG-001-C1', 1, 'carga', 3, 12000.0, DATE '2018-02-01'),
  ('WAG-002-P1', 2, 'pasajeros', 1, 15000.0, DATE '2019-03-10'),
  ('WAG-002-P2', 2, 'pasajeros', 2, 15000.0, DATE '2019-03-10'),
  ('WAG-002-C1', 2, 'carga', 3, 12000.0, DATE '2019-04-01')
) AS v(codigo_wagon, id_tren, tipo_wagon, posicion_tren, peso_vacio_kg, fecha_fabricacion)
ON CONFLICT (codigo_wagon) DO NOTHING;

-- ============================================
-- 2.3 TABLA: wagon_pasajeros
-- ============================================
CREATE TABLE IF NOT EXISTS dw.wagon_pasajeros (
    id_wagon INT PRIMARY KEY,
    cantidad_asientos INT NOT NULL CHECK (cantidad_asientos > 0),
    clase_asiento VARCHAR(50) DEFAULT 'economica',
    aire_acondicionado BOOLEAN DEFAULT TRUE,
    enchufes_usb INT DEFAULT 0,
    FOREIGN KEY (id_wagon) REFERENCES dw.wagon(id_wagon) ON DELETE CASCADE
);

INSERT INTO dw.wagon_pasajeros (id_wagon, cantidad_asientos, clase_asiento, aire_acondicionado)
SELECT * FROM (VALUES
  (1, 100, 'economica', TRUE),
  (2, 100, 'economica', TRUE),
  (4, 95, 'economica', TRUE),
  (5, 95, 'economica', TRUE)
) AS v(id_wagon, cantidad_asientos, clase_asiento, aire_acondicionado)
ON CONFLICT (id_wagon) DO NOTHING;

-- ============================================
-- 2.4 TABLA: wagon_carga
-- ============================================
CREATE TABLE IF NOT EXISTS dw.wagon_carga (
    id_wagon INT PRIMARY KEY,
    capacidad_carga_kg DECIMAL(12,2) NOT NULL,
    tipo_carga VARCHAR(100) DEFAULT 'general',
    sistema_refrigeracion BOOLEAN DEFAULT FALSE,
    volumen_m3 DECIMAL(10,3),
    FOREIGN KEY (id_wagon) REFERENCES dw.wagon(id_wagon) ON DELETE CASCADE
);

INSERT INTO dw.wagon_carga (id_wagon, capacidad_carga_kg, tipo_carga, sistema_refrigeracion, volumen_m3)
SELECT * FROM (VALUES
  (3, 5000.0, 'general', FALSE, 25.5),
  (6, 4800.0, 'general', FALSE, 24.2)
) AS v(id_wagon, capacidad_carga_kg, tipo_carga, sistema_refrigeracion, volumen_m3)
ON CONFLICT (id_wagon) DO NOTHING;

-- ============================================
-- 2.5 TABLA: asiento
-- ============================================
CREATE TABLE IF NOT EXISTS dw.asiento (
    id_asiento SERIAL PRIMARY KEY,
    codigo_asiento VARCHAR(10) NOT NULL,
    id_wagon INT NOT NULL,
    fila INT NOT NULL,
    columna INT NOT NULL,
    ventana BOOLEAN DEFAULT FALSE,
    pasillo BOOLEAN DEFAULT FALSE,
    UNIQUE(id_wagon, codigo_asiento),
    UNIQUE(id_wagon, fila, columna),
    FOREIGN KEY (id_wagon) REFERENCES dw.wagon_pasajeros(id_wagon) ON DELETE CASCADE
);

INSERT INTO dw.asiento (codigo_asiento, id_wagon, fila, columna, ventana, pasillo)
SELECT
    CONCAT(CHR((64 + ROW_NUMBER() OVER (PARTITION BY f ORDER BY c))::int), c),
    1,
    f,
    c,
    c IN (1, 10),
    c IN (5, 6)
FROM (
    SELECT GENERATE_SERIES(1, 10) as f, GENERATE_SERIES(1, 10) as c
) grid
WHERE NOT EXISTS (SELECT 1 FROM dw.asiento WHERE id_wagon = 1);

INSERT INTO dw.asiento (codigo_asiento, id_wagon, fila, columna, ventana, pasillo)
SELECT
    CONCAT('A', n),
    2,
    (n - 1) / 10 + 1,
    MOD(n - 1, 10) + 1,
    FALSE,
    FALSE
FROM generate_series(1, 100) AS n
WHERE NOT EXISTS (SELECT 1 FROM dw.asiento WHERE id_wagon = 2);

-- ============================================
-- 3.1 TABLA: viaje
-- ============================================
CREATE TABLE IF NOT EXISTS dw.viaje (
    id_viaje SERIAL PRIMARY KEY,
    codigo_viaje VARCHAR(20) UNIQUE NOT NULL,
    id_tren INT NOT NULL,
    id_ruta INT NOT NULL,
    fecha_salida TIMESTAMP NOT NULL,
    fecha_llegada_estimada TIMESTAMP NOT NULL,
    fecha_llegada_real TIMESTAMP,
    estado_viaje VARCHAR(50) DEFAULT 'programado',
    consumo_combustible_real DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tren) REFERENCES dw.tren(id_tren),
    FOREIGN KEY (id_ruta) REFERENCES dw.ruta_ferroviaria(id_ruta),
    CHECK (fecha_llegada_estimada > fecha_salida),
    CHECK (estado_viaje IN ('programado', 'en_transito', 'completado', 'cancelado'))
);

INSERT INTO dw.viaje (codigo_viaje, id_tren, id_ruta, fecha_salida, fecha_llegada_estimada, estado_viaje)
SELECT * FROM (VALUES
  ('VJ-2026-06-17-001', 1, 1, TIMESTAMP '2026-06-17 07:00:00', TIMESTAMP '2026-06-17 15:00:00', 'completado'),
  ('VJ-2026-06-17-002', 2, 2, TIMESTAMP '2026-06-17 09:00:00', TIMESTAMP '2026-06-17 18:00:00', 'en_transito'),
  ('VJ-2026-06-17-003', 3, 3, TIMESTAMP '2026-06-17 08:00:00', TIMESTAMP '2026-06-18 02:00:00', 'programado')
) AS v(codigo_viaje, id_tren, id_ruta, fecha_salida, fecha_llegada_estimada, estado_viaje)
ON CONFLICT (codigo_viaje) DO NOTHING;

-- ============================================
-- 3.2 TABLA: usuario_venta (mantenida solo para pago_ventanilla.id_usuario_operador)
-- ============================================
CREATE TABLE IF NOT EXISTS dw.usuario_venta (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20),
    documento_identidad VARCHAR(20) UNIQUE,
    id_estacion INT NOT NULL,
    tipo_usuario VARCHAR(50) DEFAULT 'operador_ventanilla',
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_estacion) REFERENCES dw.estacion(id_estacion)
);

INSERT INTO dw.usuario_venta (nombre, email, id_estacion, tipo_usuario)
SELECT * FROM (VALUES
  ('Juan Perez', 'juan.perez@ferroviaria.com', 1, 'operador_ventanilla'),
  ('Maria Garcia', 'maria.garcia@ferroviaria.com', 2, 'operador_ventanilla'),
  ('Carlos Lopez', 'carlos.lopez@ferroviaria.com', 1, 'vendedor_qr')
) AS v(nombre, email, id_estacion, tipo_usuario)
ON CONFLICT (documento_identidad) DO NOTHING;

-- ============================================
