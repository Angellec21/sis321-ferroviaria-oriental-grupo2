// ============================================
// Controlador: Compra Pública (sin registro de cliente)
// El cliente NO crea cuenta. Solo elige viaje, asientos,
// datos del pasajero y paga vía la Pasarela de Pagos (QR/Transferencia).
// ============================================

import pool, { query } from '../config/database.js';

const TIPOS_PASARELA = ['qr', 'transferencia'];

/**
 * POST /api/public/compras
 * Crea la venta + reservas para un cliente anónimo (sin id_usuario)
 * @body { id_viaje, pasajeros: [{ id_asiento, nombre_pasajero, documento_pasajero, email_pasajero?, telefono_pasajero? }] }
 */
export const crearCompra = async (req, res) => {
  const { id_viaje, pasajeros } = req.body;

  if (!id_viaje || !Array.isArray(pasajeros) || pasajeros.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: id_viaje, pasajeros[] (al menos uno con nombre_pasajero y documento_pasajero)',
      code: 'MISSING_FIELDS'
    });
  }

  if (pasajeros.some((p) => !p.id_asiento || !p.nombre_pasajero || !p.documento_pasajero)) {
    return res.status(400).json({
      success: false,
      message: 'Cada pasajero requiere id_asiento, nombre_pasajero y documento_pasajero',
      code: 'INVALID_PASSENGER'
    });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const viajeRes = await cliente.query(
      `SELECT v.id_viaje, rf.estacion_origen, rf.tarifa_adulto
       FROM dw.viaje v
       JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
       WHERE v.id_viaje = $1`,
      [id_viaje]
    );

    if (viajeRes.rows.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Viaje no encontrado', code: 'TRIP_NOT_FOUND' });
    }

    const { estacion_origen, tarifa_adulto } = viajeRes.rows[0];
    const tarifa = Number(tarifa_adulto) || 60;
    const montoTotal = tarifa * pasajeros.length;
    const codigoVenta = `WEB${Date.now()}`;

    const venta = await cliente.query(
      `INSERT INTO dw.venta (codigo_venta, id_usuario, id_estacion, monto_total, sincronizado_central)
       VALUES ($1, NULL, $2, $3, TRUE)
       RETURNING id_venta, codigo_venta, monto_total, fecha_venta`,
      [codigoVenta, estacion_origen, montoTotal]
    );
    const idVenta = venta.rows[0].id_venta;

    const reservasCreadas = [];
    for (const [i, pax] of pasajeros.entries()) {
      const codigoReserva = `WR${Date.now()}${i}`;
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
          pax.documento_pasajero,
          pax.email_pasajero || null,
          pax.telefono_pasajero || null
        ]
      );
      reservasCreadas.push(reserva.rows[0]);
    }

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Compra registrada, continúa con el pago',
      data: { venta: venta.rows[0], reservas: reservasCreadas }
    });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[PUBLICO CREAR COMPRA] Error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Uno de los asientos seleccionados ya fue reservado. Vuelve a elegir asiento.',
        code: 'SEAT_ALREADY_RESERVED'
      });
    }

    res.status(500).json({ success: false, message: 'Error al registrar la compra', code: 'PURCHASE_ERROR' });
  } finally {
    cliente.release();
  }
};

/**
 * POST /api/public/pagos
 * Simula la Pasarela de Pagos externa (QR / Transferencia):
 * el cliente elige el método, "la pasarela" aprueba la transacción
 * y el sistema confirma el pago y marca las reservas como pagadas.
 * @body { id_venta, tipo_pago: 'qr' | 'transferencia' }
 */
export const procesarPago = async (req, res) => {
  const { id_venta, tipo_pago } = req.body;

  if (!id_venta || !TIPOS_PASARELA.includes(tipo_pago)) {
    return res.status(400).json({
      success: false,
      message: `Campos requeridos: id_venta, tipo_pago (uno de: ${TIPOS_PASARELA.join(', ')})`,
      code: 'MISSING_FIELDS'
    });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const ventaRes = await cliente.query(
      `SELECT id_venta, codigo_venta, monto_total FROM dw.venta WHERE id_venta = $1 AND id_usuario IS NULL`,
      [id_venta]
    );

    if (ventaRes.rows.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Compra no encontrada', code: 'SALE_NOT_FOUND' });
    }

    const yaPagado = await cliente.query(
      `SELECT 1 FROM dw.pago WHERE id_venta = $1 AND estado_pago = 'confirmado'`,
      [id_venta]
    );
    if (yaPagado.rows.length > 0) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Esta compra ya fue pagada', code: 'ALREADY_PAID' });
    }

    const venta = ventaRes.rows[0];
    const referenciaExterna = `GW-${Date.now()}`;
    const codigoPago = `P-${Date.now()}`;

    const pago = await cliente.query(
      `INSERT INTO dw.pago (codigo_pago, id_venta, monto, tipo_pago, estado_pago, fecha_pago)
       VALUES ($1, $2, $3, $4, 'confirmado', NOW())
       RETURNING id_pago, codigo_pago, monto, tipo_pago, estado_pago, fecha_pago`,
      [codigoPago, id_venta, venta.monto_total, tipo_pago]
    );
    const idPago = pago.rows[0].id_pago;

    if (tipo_pago === 'qr') {
      await cliente.query(
        `INSERT INTO dw.pago_qr (id_pago, codigo_qr, transaccion_externa_id)
         VALUES ($1, $2, $3)`,
        [idPago, `QR-${venta.codigo_venta}`, referenciaExterna]
      );
    } else {
      await cliente.query(
        `INSERT INTO dw.pago_transferencia (id_pago, numero_referencia_transferencia)
         VALUES ($1, $2)`,
        [idPago, referenciaExterna]
      );
    }

    await cliente.query(
      `UPDATE dw.reserva SET estado_reserva = 'pagada' WHERE id_venta = $1 AND estado_reserva = 'activa'`,
      [id_venta]
    );

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Pago aprobado por la pasarela',
      data: { ...pago.rows[0], referenciaExterna, codigoVenta: venta.codigo_venta }
    });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[PUBLICO PAGO] Error:', error);
    res.status(500).json({ success: false, message: 'La pasarela no pudo procesar el pago', code: 'GATEWAY_ERROR' });
  } finally {
    cliente.release();
  }
};

/**
 * GET /api/public/compras/:codigo
 * Consulta el ticket por código de venta (no requiere cuenta)
 */
export const obtenerCompraPorCodigo = async (req, res) => {
  const { codigo } = req.params;

  const venta = await query(
    `SELECT v.id_venta, v.codigo_venta, v.monto_total, v.fecha_venta, e.nombre AS estacion
     FROM dw.venta v
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     WHERE v.codigo_venta = $1 AND v.id_usuario IS NULL`,
    [codigo]
  );

  if (venta.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Ticket no encontrado', code: 'NOT_FOUND' });
  }

  const reservas = await query(
    `SELECT r.id_reserva, r.codigo_reserva, r.nombre_pasajero, r.estado_reserva, a.codigo_asiento,
            vi.codigo_viaje, vi.fecha_salida, rf.nombre AS ruta
     FROM dw.reserva r
     JOIN dw.asiento a ON r.id_asiento = a.id_asiento
     JOIN dw.viaje vi ON r.id_viaje = vi.id_viaje
     JOIN dw.ruta_ferroviaria rf ON vi.id_ruta = rf.id_ruta
     WHERE r.id_venta = $1`,
    [venta.rows[0].id_venta]
  );

  const pagos = await query(
    `SELECT codigo_pago, monto, tipo_pago, estado_pago, fecha_pago FROM dw.pago WHERE id_venta = $1`,
    [venta.rows[0].id_venta]
  );

  res.json({ success: true, data: { ...venta.rows[0], reservas: reservas.rows, pagos: pagos.rows } });
};

export default { crearCompra, procesarPago, obtenerCompraPorCodigo };
