// ============================================
// Controlador: Ventas (venta pura, sin reserva intermedia)
// Cada fila de dw.venta es un pasajero/asiento. Varias filas creadas en
// la misma operación comparten codigo_venta (agrupa la compra para el
// pago y el recibo), aunque cada una tiene su propio id_venta.
// ============================================

import pool, { query, getAll } from '../config/database.js';

const TARIFA_DEFAULT = 60; // Bs, tarifa plana simplificada

/**
 * POST /api/ventas
 * Crea una venta por cada pasajero (transacción única, mismo codigo_venta)
 * @body { id_estacion, id_viaje, pasajeros: [{ id_asiento, nombre_pasajero, documento_pasajero, email_pasajero?, telefono_pasajero? }], tarifa? }
 */
export const crearVenta = async (req, res) => {
  const { id_estacion, id_viaje, pasajeros, tarifa = TARIFA_DEFAULT } = req.body;
  const idUsuario = req.usuario?.id_usuario || null;

  if (!id_estacion || !id_viaje || !Array.isArray(pasajeros) || pasajeros.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: id_estacion, id_viaje, pasajeros[] (al menos uno)',
      code: 'MISSING_FIELDS'
    });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const codigoVenta = `V-${Date.now()}`;
    const ventasCreadas = [];
    for (const pax of pasajeros) {
      const venta = await cliente.query(
        `INSERT INTO dw.venta
            (codigo_venta, id_usuario, id_estacion, monto_total, id_viaje, id_asiento,
             nombre_pasajero, documento_pasajero, email_pasajero, telefono_pasajero, estado_venta, sincronizado_central)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activa', TRUE)
         RETURNING id_venta, codigo_venta, monto_total, fecha_venta, id_asiento, nombre_pasajero`,
        [
          codigoVenta,
          idUsuario,
          id_estacion,
          tarifa,
          id_viaje,
          pax.id_asiento,
          pax.nombre_pasajero,
          pax.documento_pasajero || null,
          pax.email_pasajero || null,
          pax.telefono_pasajero || null
        ]
      );
      ventasCreadas.push(venta.rows[0]);
    }

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: {
        venta: {
          id_venta: ventasCreadas[0].id_venta,
          codigo_venta: codigoVenta,
          monto_total: tarifa * pasajeros.length,
          fecha_venta: ventasCreadas[0].fecha_venta
        },
        reservas: ventasCreadas
      }
    });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[VENTAS CREAR] Error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Uno de los asientos seleccionados ya fue vendido para este viaje',
        code: 'SEAT_ALREADY_RESERVED'
      });
    }

    res.status(500).json({ success: false, message: 'Error al crear la venta', code: 'SALE_ERROR' });
  } finally {
    cliente.release();
  }
};

/**
 * GET /api/ventas
 * Listar ventas agrupadas por codigo_venta (una compra puede tener varios pasajeros)
 */
export const listarVentas = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const ventas = await getAll(
    `SELECT MIN(v.id_venta) AS id_venta, v.codigo_venta, MIN(v.fecha_venta) AS fecha_venta,
            SUM(v.monto_total) AS monto_total, COUNT(*) AS pasajeros,
            bool_and(v.sincronizado_central) AS sincronizado_central,
            e.nombre AS estacion, u.nombre AS vendedor
     FROM dw.venta v
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     LEFT JOIN dw.usuarios u ON v.id_usuario = u.id_usuario
     GROUP BY v.codigo_venta, e.nombre, u.nombre
     ORDER BY MIN(v.fecha_venta) DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({ success: true, data: ventas, pagination: { page, limit } });
};

/**
 * GET /api/ventas/:id
 * Detalle de una venta: muestra todas las filas que comparten su
 * codigo_venta (los demás pasajeros de la misma compra) y sus pagos.
 */
export const obtenerVenta = async (req, res) => {
  const { id } = req.params;

  const cabecera = await query(`SELECT codigo_venta FROM dw.venta WHERE id_venta = $1`, [id]);
  if (cabecera.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Venta no encontrada', code: 'SALE_NOT_FOUND' });
  }
  const codigoVenta = cabecera.rows[0].codigo_venta;

  const filas = await getAll(
    `SELECT v.id_venta, v.codigo_venta, v.monto_total, v.fecha_venta, v.nombre_pasajero,
            v.estado_venta, v.id_asiento, e.nombre AS estacion
     FROM dw.venta v
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     WHERE v.codigo_venta = $1
     ORDER BY v.id_venta`,
    [codigoVenta]
  );

  const montoTotal = filas.reduce((suma, f) => suma + Number(f.monto_total), 0);
  const pagos = await getAll(
    `SELECT id_pago, codigo_pago, monto, tipo_pago, estado_pago, fecha_pago
     FROM dw.pago WHERE id_venta = ANY($1)`,
    [filas.map((f) => f.id_venta)]
  );

  res.json({
    success: true,
    data: {
      codigo_venta: codigoVenta,
      estacion: filas[0].estacion,
      fecha_venta: filas[0].fecha_venta,
      monto_total: montoTotal,
      reservas: filas.map((f) => ({
        id_reserva: f.id_venta,
        codigo_reserva: f.codigo_venta,
        nombre_pasajero: f.nombre_pasajero,
        estado_reserva: f.estado_venta,
        id_asiento: f.id_asiento
      })),
      pagos
    }
  });
};

/**
 * PATCH /api/ventas/:id/cancelar
 * Cancela una venta (libera el asiento)
 */
export const cancelarVenta = async (req, res) => {
  const { id } = req.params;

  const venta = await query(
    `UPDATE dw.venta SET estado_venta = 'cancelada'
     WHERE id_venta = $1 AND estado_venta != 'cancelada'
     RETURNING id_venta, codigo_venta, estado_venta`,
    [id]
  );

  if (venta.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Venta no encontrada o ya estaba cancelada',
      code: 'SALE_NOT_FOUND'
    });
  }

  res.json({ success: true, message: 'Venta cancelada', data: venta.rows[0] });
};

export default { crearVenta, listarVentas, obtenerVenta, cancelarVenta };
