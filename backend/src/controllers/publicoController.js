// ============================================
// Controlador: Compra Pública (sin registro de cliente)
// El cliente NO crea cuenta. Solo elige viaje, asientos,
// datos del pasajero y paga vía la Pasarela de Pagos (QR/Transferencia).
// Venta pura: cada pasajero/asiento es su propia fila de dw.venta;
// varias filas de una misma compra comparten codigo_venta.
// ============================================

import pool, { query } from '../config/database.js';

const TIPOS_PASARELA = ['qr', 'transferencia'];

/**
 * POST /api/public/compras
 * Crea una venta por cada pasajero anónimo (sin id_usuario), todas con
 * el mismo codigo_venta
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
    const codigoVenta = `WEB${Date.now()}`;

    const ventasCreadas = [];
    for (const pax of pasajeros) {
      const venta = await cliente.query(
        `INSERT INTO dw.venta
            (codigo_venta, id_usuario, id_estacion, monto_total, id_viaje, id_asiento,
             nombre_pasajero, documento_pasajero, email_pasajero, telefono_pasajero, estado_venta, sincronizado_central)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'activa', TRUE)
         RETURNING id_venta, codigo_venta, monto_total, id_asiento, nombre_pasajero`,
        [
          codigoVenta,
          estacion_origen,
          tarifa,
          id_viaje,
          pax.id_asiento,
          pax.nombre_pasajero,
          pax.documento_pasajero,
          pax.email_pasajero || null,
          pax.telefono_pasajero || null
        ]
      );
      ventasCreadas.push(venta.rows[0]);
    }

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Compra registrada, continúa con el pago',
      data: {
        venta: {
          id_venta: ventasCreadas[0].id_venta,
          codigo_venta: codigoVenta,
          monto_total: tarifa * pasajeros.length
        },
        reservas: ventasCreadas
      }
    });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[PUBLICO CREAR COMPRA] Error:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Uno de los asientos seleccionados ya fue vendido. Vuelve a elegir asiento.',
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
 * Simula la Pasarela de Pagos externa (QR / Transferencia): el cliente
 * elige el método, "la pasarela" aprueba la transacción y el sistema
 * confirma el pago (un solo pago cubre todas las ventas del mismo
 * codigo_venta) y marca esas ventas como pagadas.
 * @body { codigo_venta, tipo_pago: 'qr' | 'transferencia' }
 */
export const procesarPago = async (req, res) => {
  const { codigo_venta, tipo_pago } = req.body;

  if (!codigo_venta || !TIPOS_PASARELA.includes(tipo_pago)) {
    return res.status(400).json({
      success: false,
      message: `Campos requeridos: codigo_venta, tipo_pago (uno de: ${TIPOS_PASARELA.join(', ')})`,
      code: 'MISSING_FIELDS'
    });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const ventasRes = await cliente.query(
      `SELECT id_venta, monto_total FROM dw.venta
       WHERE codigo_venta = $1 AND id_usuario IS NULL AND estado_venta != 'cancelada'
       ORDER BY id_venta`,
      [codigo_venta]
    );

    if (ventasRes.rows.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Compra no encontrada', code: 'SALE_NOT_FOUND' });
    }

    const idVentaPrincipal = ventasRes.rows[0].id_venta;
    const montoTotal = ventasRes.rows.reduce((suma, v) => suma + Number(v.monto_total), 0);

    const yaPagado = await cliente.query(
      `SELECT 1 FROM dw.pago WHERE id_venta = $1 AND estado_pago = 'confirmado'`,
      [idVentaPrincipal]
    );
    if (yaPagado.rows.length > 0) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Esta compra ya fue pagada', code: 'ALREADY_PAID' });
    }

    const referenciaExterna = `GW-${Date.now()}`;
    const codigoPago = `P-${Date.now()}`;

    const pago = await cliente.query(
      `INSERT INTO dw.pago (codigo_pago, id_venta, monto, tipo_pago, estado_pago, fecha_pago)
       VALUES ($1, $2, $3, $4, 'confirmado', NOW())
       RETURNING id_pago, codigo_pago, monto, tipo_pago, estado_pago, fecha_pago`,
      [codigoPago, idVentaPrincipal, montoTotal, tipo_pago]
    );
    const idPago = pago.rows[0].id_pago;

    if (tipo_pago === 'qr') {
      await cliente.query(
        `INSERT INTO dw.pago_qr (id_pago, codigo_qr, transaccion_externa_id)
         VALUES ($1, $2, $3)`,
        [idPago, `QR-${codigo_venta}`, referenciaExterna]
      );
    } else {
      await cliente.query(
        `INSERT INTO dw.pago_transferencia (id_pago, numero_referencia_transferencia)
         VALUES ($1, $2)`,
        [idPago, referenciaExterna]
      );
    }

    await cliente.query(
      `UPDATE dw.venta SET estado_venta = 'pagada' WHERE codigo_venta = $1 AND estado_venta = 'activa'`,
      [codigo_venta]
    );

    await cliente.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Pago aprobado por la pasarela',
      data: { ...pago.rows[0], referenciaExterna, codigoVenta: codigo_venta }
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
 * Consulta el ticket por código de venta (no requiere cuenta). Agrupa
 * todas las filas de venta que comparten ese codigo_venta.
 */
export const obtenerCompraPorCodigo = async (req, res) => {
  const { codigo } = req.params;

  const filas = await query(
    `SELECT v.id_venta, v.codigo_venta, v.monto_total, v.nombre_pasajero, v.estado_venta, v.fecha_venta,
            a.codigo_asiento, vi.codigo_viaje, vi.fecha_salida, rf.nombre AS ruta, e.nombre AS estacion
     FROM dw.venta v
     JOIN dw.asiento a ON v.id_asiento = a.id_asiento
     JOIN dw.viaje vi ON v.id_viaje = vi.id_viaje
     JOIN dw.ruta_ferroviaria rf ON vi.id_ruta = rf.id_ruta
     JOIN dw.estacion e ON v.id_estacion = e.id_estacion
     WHERE v.codigo_venta = $1 AND v.id_usuario IS NULL
     ORDER BY v.id_venta`,
    [codigo]
  );

  if (filas.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Ticket no encontrado', code: 'NOT_FOUND' });
  }

  const primera = filas.rows[0];
  const montoTotal = filas.rows.reduce((suma, f) => suma + Number(f.monto_total), 0);

  const pagos = await query(
    `SELECT codigo_pago, monto, tipo_pago, estado_pago, fecha_pago FROM dw.pago WHERE id_venta = ANY($1)`,
    [filas.rows.map((f) => f.id_venta)]
  );

  res.json({
    success: true,
    data: {
      id_venta: primera.id_venta,
      codigo_venta: primera.codigo_venta,
      monto_total: montoTotal,
      fecha_venta: primera.fecha_venta,
      estacion: primera.estacion,
      reservas: filas.rows.map((f) => ({
        id_reserva: f.id_venta,
        codigo_reserva: f.codigo_venta,
        nombre_pasajero: f.nombre_pasajero,
        estado_reserva: f.estado_venta,
        codigo_asiento: f.codigo_asiento,
        ruta: f.ruta,
        fecha_salida: f.fecha_salida
      })),
      pagos: pagos.rows
    }
  });
};

export default { crearCompra, procesarPago, obtenerCompraPorCodigo };
