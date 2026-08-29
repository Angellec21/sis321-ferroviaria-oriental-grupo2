-- ============================================
-- SCRIPT: Fusiona dw.reserva dentro de dw.venta ("venta pura", sin
-- tabla de reserva intermedia), alineando el esquema real con el
-- diseño documentado en Modelo Conceptual/Lógico y el Trabajo Final XP.
--
-- Cambio de cardinalidad: antes 1 venta (codigo_venta único) : N reserva.
-- Ahora N filas de venta comparten el mismo codigo_venta (deja de ser
-- único) — cada fila es un pasajero/asiento; codigo_venta agrupa toda
-- la compra para efectos de pago y recibo.
--
-- Verificado antes de escribir este script: en producción la relación
-- venta:reserva ya era 1:1 en el 100% de los casos (6719/6719), por lo
-- que la migración de datos es directa, sin necesidad de dividir filas.
-- ============================================

BEGIN;

ALTER TABLE dw.venta DROP CONSTRAINT IF EXISTS venta_codigo_venta_key;

ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS id_viaje INT;
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS id_asiento INT;
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS nombre_pasajero VARCHAR(150);
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS documento_pasajero VARCHAR(20);
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS email_pasajero VARCHAR(150);
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS telefono_pasajero VARCHAR(20);
ALTER TABLE dw.venta ADD COLUMN IF NOT EXISTS estado_venta VARCHAR(50);

-- Si una venta tuviera más de una reserva, se toma la primera (por
-- id_reserva) para esta fila; no ocurre en los datos reales verificados.
WITH reserva_unica AS (
  SELECT DISTINCT ON (id_venta)
    id_venta, id_viaje, id_asiento, nombre_pasajero, documento_pasajero,
    email_pasajero, telefono_pasajero, estado_reserva
  FROM dw.reserva
  ORDER BY id_venta, id_reserva
)
UPDATE dw.venta v
SET id_viaje = ru.id_viaje,
    id_asiento = ru.id_asiento,
    nombre_pasajero = ru.nombre_pasajero,
    documento_pasajero = ru.documento_pasajero,
    email_pasajero = ru.email_pasajero,
    telefono_pasajero = ru.telefono_pasajero,
    estado_venta = ru.estado_reserva
FROM reserva_unica ru
WHERE ru.id_venta = v.id_venta;

-- Ventas sin ninguna reserva asociada (no deberían existir; se marcan
-- en vez de fallar el NOT NULL de más abajo)
UPDATE dw.venta SET estado_venta = 'sin_datos' WHERE estado_venta IS NULL;

ALTER TABLE dw.venta ALTER COLUMN estado_venta SET NOT NULL;
ALTER TABLE dw.venta ADD CONSTRAINT venta_estado_venta_check
  CHECK (estado_venta IN ('activa', 'pagada', 'cancelada', 'sin_datos'));
ALTER TABLE dw.venta ADD CONSTRAINT venta_id_viaje_fkey
  FOREIGN KEY (id_viaje) REFERENCES dw.viaje(id_viaje);
ALTER TABLE dw.venta ADD CONSTRAINT venta_id_asiento_fkey
  FOREIGN KEY (id_asiento) REFERENCES dw.asiento(id_asiento);

-- Reemplaza la restricción única que tenía reserva: mismo asiento no se
-- puede vender dos veces para el mismo viaje mientras no esté cancelada.
CREATE UNIQUE INDEX IF NOT EXISTS venta_viaje_asiento_activa_key
  ON dw.venta (id_viaje, id_asiento) WHERE estado_venta NOT IN ('cancelada', 'sin_datos');

CREATE INDEX IF NOT EXISTS idx_venta_codigo_venta ON dw.venta(codigo_venta);

ALTER TABLE dw.pago DROP CONSTRAINT IF EXISTS pago_id_reserva_fkey;
ALTER TABLE dw.pago DROP COLUMN IF EXISTS id_reserva;

DROP TABLE IF EXISTS dw.reserva;

COMMIT;
