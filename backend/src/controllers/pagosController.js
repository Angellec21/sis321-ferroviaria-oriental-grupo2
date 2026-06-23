// ============================================
// Controlador: Pagos (QR, Transferencia, Ventanilla)
// ============================================

import pool, { getAll } from '../config/database.js';

const TIPOS_VALIDOS = ['qr', 'transferencia', 'ventanilla'];

/**
 * POST /api/pagos
 * Registra un pago para una venta y/o reserva, y marca la reserva como pagada
 * @body { id_venta, id_reserva?, monto, tipo_pago, detalle_especifico? }
 *   detalle_especifico según tipo_pago:
 *     qr            -> { codigo_qr?, billetera_digital?, transaccion_externa_id? }
 *     transferencia -> { banco_origen?, numero_cuenta_origen?, numero_referencia_transferencia?, banco_receptor? }
 *     ventanilla    -> { id_usuario_operador (FK a dw.usuario_venta), metodo_pago_local?, comprobante_numero? }
 */
export const crearPago = async (req, res) => {
  const { id_venta, id_reserva = null, monto, tipo_pago, detalle_especifico = {} } = req.body;

  if (!id_venta || !monto || !tipo_pago || !TIPOS_VALIDOS.includes(tipo_pago)) {
    return res.status(400).json({
      success: false,
      message: `Campos requeridos: id_venta, monto, tipo_pago (uno de: ${TIPOS_VALIDOS.join(', ')})`,
      code: 'MISSING_FIELDS'
    });
  }

  if (tipo_pago === 'ventanilla' && !detalle_especifico.id_usuario_operador) {
    return res.status(400).json({
      success: false,
      message: 'Pago en ventanilla requiere detalle_especifico.id_usuario_operador (FK a dw.usuario_venta)',
      code: 'MISSING_OPERATOR'
    });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const codigoPago = `P-${Date.now()}`;
    const pago = await cliente.query(
      `INSERT INTO dw.pago (codigo_pago, id_reserva, id_venta, monto, tipo_pago, estado_pago, fecha_pago)
       VALUES ($1, $2, $3, $4, $5, 'confirmado', NOW())
       RETURNING id_pago, codigo_pago, monto, tipo_pago, estado_pago, fecha_pago`,
      [codigoPago, id_reserva, id_venta, monto, tipo_pago]
    );
    const idPago = pago.rows[0].id_pago;

    if (tipo_pago === 'qr') {
      await cliente.query(
        `INSERT INTO dw.pago_qr (id_pago, codigo_qr, billetera_digital, transaccion_externa_id)
         VALUES ($1, $2, $3, $4)`,
        [idPago, detalle_especifico.codigo_qr || null, detalle_especifico.billetera_digital || null, detalle_especifico.transaccion_externa_id || null]
      );
    } else if (tipo_pago === 'transferencia') {
      await cliente.query(
        `INSERT INTO dw.pago_transferencia (id_pago, banco_origen, numero_cuenta_origen, numero_referencia_transferencia, banco_receptor)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          idPago,
          detalle_especifico.banco_origen || null,
          detalle_especifico.numero_cuenta_origen || null,
          detalle_especifico.numero_referencia_transferencia || null,
          detalle_especifico.banco_receptor || null
        ]
      );
    } else if (tipo_pago === 'ventanilla') {
      await cliente.query(
        `INSERT INTO dw.pago_ventanilla (id_pago, id_usuario_operador, metodo_pago_local, comprobante_numero)
         VALUES ($1, $2, $3, $4)`,
        [
          idPago,
          detalle_especifico.id_usuario_operador,
          detalle_especifico.metodo_pago_local || 'efectivo',
          detalle_especifico.comprobante_numero || null
        ]
      );
    }

    if (id_reserva) {
      await cliente.query(
        `UPDATE dw.reserva SET estado_reserva = 'pagada' WHERE id_reserva = $1`,
        [id_reserva]
      );
    } else {
      await cliente.query(
        `UPDATE dw.reserva SET estado_reserva = 'pagada' WHERE id_venta = $1 AND estado_reserva = 'activa'`,
        [id_venta]
      );
    }

    await cliente.query('COMMIT');

    res.status(201).json({ success: true, message: 'Pago registrado exitosamente', data: pago.rows[0] });
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[PAGOS CREAR] Error:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el pago', code: 'PAYMENT_ERROR' });
  } finally {
    cliente.release();
  }
};

/**
 * GET /api/pagos
 * Listar pagos (paginado, filtro opcional por tipo_pago)
 */
export const listarPagos = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { tipo_pago } = req.query;

  const params = [];
  let where = '';
  if (tipo_pago && TIPOS_VALIDOS.includes(tipo_pago)) {
    params.push(tipo_pago);
    where = `WHERE p.tipo_pago = $${params.length}`;
  }
  params.push(limit, offset);

  const pagos = await getAll(
    `SELECT p.id_pago, p.codigo_pago, p.monto, p.tipo_pago, p.estado_pago, p.fecha_pago,
            v.codigo_venta, r.codigo_reserva
     FROM dw.pago p
     LEFT JOIN dw.venta v ON p.id_venta = v.id_venta
     LEFT JOIN dw.reserva r ON p.id_reserva = r.id_reserva
     ${where}
     ORDER BY p.fecha_pago DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ success: true, data: pagos, pagination: { page, limit } });
};

export default { crearPago, listarPagos };
