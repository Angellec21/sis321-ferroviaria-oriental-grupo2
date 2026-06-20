// ============================================
// Controlador: Ventas y Reservas
// ============================================

import pool, { query, getAll } from '../config/database.js';

const TARIFA_DEFAULT = 60; // Bs, tarifa plana simplificada

/**
 * POST /api/ventas
 * Crea una venta junto con sus reservas (transacción)
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

    const montoTotal = tarifa * pasajeros.length;
    const codigoVenta = `V-${Date.now()}`;

    const venta = await cliente.query(
      `INSERT INTO dw.venta (codigo_venta, id_usuario, id_estacion, monto_total, sincronizado_central)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id_venta, codigo_venta, monto_total, fecha_venta`,
      [codigoVenta, idUsuario, id_estacion, montoTotal]
    );
    const idVenta = venta.rows[0].id_venta;

    const reservasCreadas = [];
    for (const [i, pax] of pasajeros.entries()) {
      const codigoReserva = `R-${Date.now()}-${i}`;
      const reserva = await cliente.query(
        `INSERT INTO dw.reserva
            (codigo_reserva, id_viaje, id_asiento, id_venta, nombre_pasajero, documento_pasajero, email_pasajero, telefono_pasajero, estado_reserva)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activa')
         RETURNING id_reserva, codigo_reserva, id_asiento, nombre_pasajero`,
        [
          codigoReserva,
          id_viaje,
          pax.id_asiento,
          idVenta,
          pax.nombre_pasajero,
          pax.documento_pasajero || null,
          pax.email_pasajero || null,
          pax.telefono_pasajero || null
        ]
      );
      reservasCreadas.push(reserva.rows[0]);
    }

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Venta y reservas creadas exitosamente',
      data: {
        venta: venta.rows[0],
        reservas: reservasCreadas
      }
    });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[VENTAS CREAR] Error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Uno de los asientos seleccionados ya fue reservado para este viaje',
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
 * Listar ventas (paginado simple)
 */
export const listarVentas = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const ventas = await getAll(
    `SELECT v.id_venta, v.codigo_venta, v.monto_total, v.fecha_venta, v.sincronizado_central,
            e.nombre AS estacion, u.nombre AS vendedor
     FROM dw.venta v
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     LEFT JOIN dw.usuarios u ON v.id_usuario = u.id_usuario
     ORDER BY v.fecha_venta DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({ success: true, data: ventas, pagination: { page, limit } });
};

/**
 * GET /api/ventas/:id
 * Detalle de una venta con sus reservas y pagos
 */
export const obtenerVenta = async (req, res) => {
  const { id } = req.params;

  const venta = await query(
    `SELECT v.id_venta, v.codigo_venta, v.monto_total, v.fecha_venta, e.nombre AS estacion
     FROM dw.venta v
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     WHERE v.id_venta = $1`,
    [id]
  );

  if (venta.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Venta no encontrada', code: 'SALE_NOT_FOUND' });
  }

  const reservas = await getAll(
    `SELECT id_reserva, codigo_reserva, nombre_pasajero, estado_reserva, id_asiento
     FROM dw.reserva WHERE id_venta = $1`,
    [id]
  );

  const pagos = await getAll(
    `SELECT id_pago, codigo_pago, monto, tipo_pago, estado_pago, fecha_pago
     FROM dw.pago WHERE id_venta = $1`,
    [id]
  );

  res.json({ success: true, data: { ...venta.rows[0], reservas, pagos } });
};

/**
 * PATCH /api/ventas/reservas/:id/cancelar
 * Cancela una reserva y libera el asiento
 */
export const cancelarReserva = async (req, res) => {
  const { id } = req.params;

  const reserva = await query(
    `UPDATE dw.reserva SET estado_reserva = 'cancelada'
     WHERE id_reserva = $1 AND estado_reserva != 'cancelada'
     RETURNING id_reserva, codigo_reserva, estado_reserva`,
    [id]
  );

  if (reserva.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Reserva no encontrada o ya estaba cancelada',
      code: 'RESERVATION_NOT_FOUND'
    });
  }

  res.json({ success: true, message: 'Reserva cancelada', data: reserva.rows[0] });
};

export default { crearVenta, listarVentas, obtenerVenta, cancelarReserva };
