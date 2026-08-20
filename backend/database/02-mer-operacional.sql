-- 3.3 TABLA: venta
-- id_usuario referencia dw.usuarios (auth): ventasController.js /
-- publicoController.js usan el id del usuario autenticado como vendedor.
-- ============================================
CREATE TABLE IF NOT EXISTS dw.venta (
    id_venta SERIAL PRIMARY KEY,
    codigo_venta VARCHAR(20) UNIQUE NOT NULL,
    id_usuario INT,
    id_estacion INT NOT NULL,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(10,2) NOT NULL CHECK (monto_total > 0),
    sincronizado_central BOOLEAN DEFAULT FALSE,
    fecha_sync_central TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES dw.usuarios(id_usuario),
    FOREIGN KEY (id_estacion) REFERENCES dw.estacion(id_estacion)
);

-- ============================================
-- 3.4 TABLA: reserva
-- ============================================
CREATE TABLE IF NOT EXISTS dw.reserva (
    id_reserva SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(20) UNIQUE NOT NULL,
    id_viaje INT NOT NULL,
    id_asiento INT NOT NULL,
    id_venta INT NOT NULL,
    nombre_pasajero VARCHAR(150) NOT NULL,
    documento_pasajero VARCHAR(20),
    email_pasajero VARCHAR(150),
    telefono_pasajero VARCHAR(20),
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_reserva VARCHAR(50) DEFAULT 'activa',
    UNIQUE(id_viaje, id_asiento),
    FOREIGN KEY (id_viaje) REFERENCES dw.viaje(id_viaje),
    FOREIGN KEY (id_asiento) REFERENCES dw.asiento(id_asiento),
    FOREIGN KEY (id_venta) REFERENCES dw.venta(id_venta),
    CHECK (estado_reserva IN ('activa', 'pagada', 'cancelada'))
);

-- ============================================
-- 4.1 TABLA: pago
-- ============================================
CREATE TABLE IF NOT EXISTS dw.pago (
    id_pago SERIAL PRIMARY KEY,
    codigo_pago VARCHAR(30) UNIQUE NOT NULL,
    id_reserva INT,
    id_venta INT,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_pago VARCHAR(50) NOT NULL,
    estado_pago VARCHAR(50) DEFAULT 'pendiente',
    referencia_externa VARCHAR(100),
    FOREIGN KEY (id_reserva) REFERENCES dw.reserva(id_reserva),
    FOREIGN KEY (id_venta) REFERENCES dw.venta(id_venta),
    CHECK (tipo_pago IN ('qr', 'transferencia', 'ventanilla')),
    CHECK (estado_pago IN ('pendiente', 'confirmado', 'rechazado'))
);

-- ============================================
-- 4.2 TABLA: pago_qr
-- ============================================
CREATE TABLE IF NOT EXISTS dw.pago_qr (
    id_pago INT PRIMARY KEY,
    codigo_qr VARCHAR(500),
    billetera_digital VARCHAR(100),
    transaccion_externa_id VARCHAR(100),
    FOREIGN KEY (id_pago) REFERENCES dw.pago(id_pago) ON DELETE CASCADE
);

-- ============================================
-- 4.3 TABLA: pago_transferencia
-- ============================================
CREATE TABLE IF NOT EXISTS dw.pago_transferencia (
    id_pago INT PRIMARY KEY,
    banco_origen VARCHAR(100),
    numero_cuenta_origen VARCHAR(50),
    numero_referencia_transferencia VARCHAR(100) UNIQUE,
    banco_receptor VARCHAR(100),
    FOREIGN KEY (id_pago) REFERENCES dw.pago(id_pago) ON DELETE CASCADE
);

-- ============================================
-- 4.4 TABLA: pago_ventanilla
-- ============================================
CREATE TABLE IF NOT EXISTS dw.pago_ventanilla (
    id_pago INT PRIMARY KEY,
    id_usuario_operador INT NOT NULL,
    metodo_pago_local VARCHAR(50),
    comprobante_numero VARCHAR(50) UNIQUE,
    FOREIGN KEY (id_pago) REFERENCES dw.pago(id_pago) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario_operador) REFERENCES dw.usuarios(id_usuario)
);

-- ============================================
-- 5.1 TABLA: indicador
-- ============================================
CREATE TABLE IF NOT EXISTS dw.indicador (
    id_indicador SERIAL PRIMARY KEY,
    nombre_indicador VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    tipo_indicador VARCHAR(50),
    formula TEXT,
    unidad_medida VARCHAR(50),
    frecuencia_calculo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dw.indicador (nombre_indicador, tipo_indicador, unidad_medida, frecuencia_calculo)
SELECT * FROM (VALUES
  ('Tasa de Ocupacion', 'ocupacion', 'porcentaje', 'diaria'),
  ('Consumo de Combustible', 'combustible', 'km/litro', 'diaria'),
  ('Ingresos por Pago', 'ingresos', 'BOB', 'diaria')
) AS v(nombre_indicador, tipo_indicador, unidad_medida, frecuencia_calculo)
ON CONFLICT (nombre_indicador) DO NOTHING;

-- ============================================
-- 5.2 TABLA: metrica_ocupacion
-- ============================================
CREATE TABLE IF NOT EXISTS dw.metrica_ocupacion (
    id_metrica SERIAL PRIMARY KEY,
    id_indicador INT NOT NULL,
    id_ruta INT NOT NULL,
    id_wagon INT,
    fecha_calculo DATE NOT NULL,
    asientos_vendidos INT,
    asientos_totales INT,
    tasa_ocupacion DECIMAL(5,2) CHECK (tasa_ocupacion BETWEEN 0 AND 100),
    estado_ruta VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_ruta, id_wagon, fecha_calculo),
    FOREIGN KEY (id_indicador) REFERENCES dw.indicador(id_indicador),
    FOREIGN KEY (id_ruta) REFERENCES dw.ruta_ferroviaria(id_ruta),
    FOREIGN KEY (id_wagon) REFERENCES dw.wagon(id_wagon)
);

-- ============================================
-- 5.3 TABLA: metrica_combustible
-- ============================================
CREATE TABLE IF NOT EXISTS dw.metrica_combustible (
    id_metrica SERIAL PRIMARY KEY,
    id_indicador INT NOT NULL,
    id_tren INT NOT NULL,
    fecha_calculo DATE NOT NULL,
    distancia_recorrida_km DECIMAL(10,2),
    combustible_consumido_litros DECIMAL(10,2),
    rendimiento_kml DECIMAL(5,2),
    costo_combustible DECIMAL(10,2),
    desviacion_esperado DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_tren, fecha_calculo),
    FOREIGN KEY (id_indicador) REFERENCES dw.indicador(id_indicador),
    FOREIGN KEY (id_tren) REFERENCES dw.tren(id_tren)
);

-- ============================================
-- 5.4 TABLA: tablero_control
-- ============================================
CREATE TABLE IF NOT EXISTS dw.tablero_control (
    id_tablero SERIAL PRIMARY KEY,
    nombre_tablero VARCHAR(150) NOT NULL,
    descripcion TEXT,
    rol_acceso VARCHAR(100),
    indicadores_asignados TEXT,
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dw.tablero_control (nombre_tablero, rol_acceso, estado)
SELECT * FROM (VALUES
  ('Ejecutivo General', 'gerente', TRUE),
  ('Operacional', 'director_operaciones', TRUE),
  ('Analytics', 'analista_bi', TRUE)
) AS v(nombre_tablero, rol_acceso, estado)
WHERE NOT EXISTS (SELECT 1 FROM dw.tablero_control WHERE nombre_tablero = v.nombre_tablero);

-- ============================================
-- 6.1 TABLA: cola_sincronizacion
-- ============================================
CREATE TABLE IF NOT EXISTS dw.cola_sincronizacion (
    id_sync SERIAL PRIMARY KEY,
    id_estacion INT NOT NULL,
    tipo_entidad VARCHAR(100),
    id_entidad_local VARCHAR(50),
    id_entidad_central INT,
    operacion VARCHAR(20),
    payload_json JSONB,
    timestamp_local TIMESTAMP NOT NULL,
    sincronizado BOOLEAN DEFAULT FALSE,
    fecha_sync_exitosa TIMESTAMP,
    reintentos INT DEFAULT 0 CHECK (reintentos < 10),
    error_mensaje TEXT,
    UNIQUE(id_estacion, id_entidad_local),
    FOREIGN KEY (id_estacion) REFERENCES dw.estacion(id_estacion)
);

CREATE INDEX IF NOT EXISTS idx_cola_sync_estacion_status ON dw.cola_sincronizacion(id_estacion, sincronizado);
CREATE INDEX IF NOT EXISTS idx_cola_sync_timestamp ON dw.cola_sincronizacion(timestamp_local);

-- ============================================
-- TABLA: orden_mantenimiento
-- ============================================
CREATE TABLE IF NOT EXISTS dw.orden_mantenimiento (
    id_orden_mant SERIAL PRIMARY KEY,
    codigo_orden VARCHAR(30) UNIQUE NOT NULL,
    id_tren INT NOT NULL,
    id_tipo_mant INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_programada DATE,
    fecha_ejecucion DATE,
    viajes_acumulados_al_crear INT NOT NULL,
    costo_real DECIMAL(10,2),
    descripcion_actividades TEXT,
    estado_orden VARCHAR(50) DEFAULT 'pendiente',
    FOREIGN KEY (id_tren) REFERENCES dw.tren(id_tren),
    FOREIGN KEY (id_tipo_mant) REFERENCES dw.tipo_mantenimiento(id_tipo_mant),
    CHECK (estado_orden IN ('pendiente', 'programado', 'ejecución', 'completado'))
);

INSERT INTO dw.orden_mantenimiento (codigo_orden, id_tren, id_tipo_mant, viajes_acumulados_al_crear, estado_orden)
SELECT * FROM (VALUES
  ('OM-2026-001', 1, 2, 4800, 'programado'),
  ('OM-2026-002', 3, 1, 2100, 'pendiente')
) AS v(codigo_orden, id_tren, id_tipo_mant, viajes_acumulados_al_crear, estado_orden)
ON CONFLICT (codigo_orden) DO NOTHING;

-- ============================================
-- 8.1 TABLA: logs.auditoria_etl
-- ============================================
CREATE TABLE IF NOT EXISTS logs.auditoria_etl (
    id_auditoria SERIAL PRIMARY KEY,
    nombre_proceso VARCHAR(100) NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    estado VARCHAR(50),
    filas_procesadas INT,
    filas_insertadas INT,
    filas_actualizadas INT,
    filas_rechazadas INT,
    duracion_segundos INT,
    errores TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_proceso_fecha ON logs.auditoria_etl(nombre_proceso, fecha_inicio DESC);

-- ============================================
-- INDICES CRITICOS (requieren tablas de venta/pago ya creadas)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pago_fecha_tipo ON dw.pago (tipo_pago, fecha_pago, estado_pago) INCLUDE (monto, id_reserva);
CREATE INDEX IF NOT EXISTS idx_metrica_ocupacion_ruta_fecha ON dw.metrica_ocupacion (id_ruta, fecha_calculo, tasa_ocupacion);
CREATE INDEX IF NOT EXISTS idx_viaje_ruta_fecha ON dw.viaje (id_ruta, fecha_salida, estado_viaje);
CREATE INDEX IF NOT EXISTS idx_orden_mant_tren_estado ON dw.orden_mantenimiento (id_tren, estado_orden, viajes_acumulados_al_crear);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON dw.venta(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_reserva_viaje ON dw.reserva(id_viaje);
CREATE INDEX IF NOT EXISTS idx_tren_estado ON dw.tren(estado) WHERE estado = 'operativo';
