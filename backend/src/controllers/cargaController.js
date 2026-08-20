// ============================================
// Controlador: Envíos de Carga
// ============================================

import { query, getAll } from '../config/database.js';

const ESTADOS_VALIDOS = ['registrado', 'en_transito', 'entregado', 'cancelado'];

/**
 * POST /api/carga/envios
 * Registra un envío de carga, validando que no exceda la capacidad
 * restante del vagón de carga para ese viaje.
 * @body { id_viaje, id_wagon_carga, remitente, destinatario, peso_kg, descripcion_carga? }
 */
export const crearEnvio = async (req, res) => {
  const { id_viaje, id_wagon_carga, remitente, destinatario, peso_kg, descripcion_carga } = req.body;
  const idUsuario = req.usuario?.id_usuario || null;

  if (!id_viaje || !id_wagon_carga || !remitente || !destinatario || !peso_kg) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: id_viaje, id_wagon_carga, remitente, destinatario, peso_kg',
      code: 'MISSING_FIELDS'
    });
  }

  if (Number(peso_kg) <= 0) {
    return res.status(400).json({ success: false, message: 'El peso debe ser mayor a 0', code: 'INVALID_WEIGHT' });
  }

  const vagon = await query(
    `SELECT wc.capacidad_carga_kg,
            wc.capacidad_carga_kg - COALESCE((
              SELECT SUM(peso_kg) FROM dw.envio_carga
              WHERE id_wagon_carga = wc.id_wagon AND id_viaje = $2 AND estado_envio != 'cancelado'
            ), 0) AS peso_disponible_kg
     FROM dw.wagon_carga wc
     WHERE wc.id_wagon = $1`,
    [id_wagon_carga, id_viaje]
  );

  if (vagon.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Vagón de carga no encontrado', code: 'WAGON_NOT_FOUND' });
  }

  if (Number(peso_kg) > Number(vagon.rows[0].peso_disponible_kg)) {
    return res.status(409).json({
      success: false,
      message: `Excede la capacidad disponible del vagón (${vagon.rows[0].peso_disponible_kg} kg libres)`,
      code: 'CAPACITY_EXCEEDED'
    });
  }

  const codigoEnvio = `E-${Date.now()}`;
  const envio = await query(
    `INSERT INTO dw.envio_carga
        (codigo_envio, remitente, destinatario, peso_kg, descripcion_carga, id_viaje, id_wagon_carga, id_usuario)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_envio, codigo_envio, remitente, destinatario, peso_kg, estado_envio, fecha_registro`,
    [codigoEnvio, remitente, destinatario, peso_kg, descripcion_carga || null, id_viaje, id_wagon_carga, idUsuario]
  );

  res.status(201).json({ success: true, message: 'Envío registrado exitosamente', data: envio.rows[0] });
};

/**
 * GET /api/carga/envios
 * Lista envíos, opcionalmente filtrados por viaje (?id_viaje=) o estado (?estado=)
 */
export const listarEnvios = async (req, res) => {
  const { id_viaje, estado } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const condiciones = [];
  const valores = [];
  if (id_viaje) {
    valores.push(id_viaje);
    condiciones.push(`ec.id_viaje = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`ec.estado_envio = $${valores.length}`);
  }
  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  valores.push(limit, offset);
  const envios = await getAll(
    `SELECT ec.id_envio, ec.codigo_envio, ec.remitente, ec.destinatario, ec.peso_kg,
            ec.estado_envio, ec.fecha_registro, ec.id_viaje, w.codigo_wagon,
            rf.nombre AS ruta, v.fecha_salida, u.nombre AS registrado_por
     FROM dw.envio_carga ec
     JOIN dw.wagon w ON ec.id_wagon_carga = w.id_wagon
     JOIN dw.viaje v ON ec.id_viaje = v.id_viaje
     JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
     LEFT JOIN dw.usuarios u ON ec.id_usuario = u.id_usuario
     ${whereSql}
     ORDER BY ec.fecha_registro DESC
     LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
    valores
  );

  res.json({ success: true, data: envios, pagination: { page, limit } });
};

/**
 * GET /api/carga/envios/:id
 */
export const obtenerEnvio = async (req, res) => {
  const { id } = req.params;

  const envio = await query(
    `SELECT ec.*, w.codigo_wagon, rf.nombre AS ruta, v.fecha_salida
     FROM dw.envio_carga ec
     JOIN dw.wagon w ON ec.id_wagon_carga = w.id_wagon
     JOIN dw.viaje v ON ec.id_viaje = v.id_viaje
     JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
     WHERE ec.id_envio = $1`,
    [id]
  );

  if (envio.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Envío no encontrado', code: 'SHIPMENT_NOT_FOUND' });
  }

  res.json({ success: true, data: envio.rows[0] });
};

/**
 * PATCH /api/carga/envios/:id/estado
 * @body { estado_envio: 'registrado' | 'en_transito' | 'entregado' | 'cancelado' }
 */
export const cambiarEstadoEnvio = async (req, res) => {
  const { id } = req.params;
  const { estado_envio } = req.body;

  if (!ESTADOS_VALIDOS.includes(estado_envio)) {
    return res.status(400).json({
      success: false,
      message: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
      code: 'INVALID_STATE'
    });
  }

  const envio = await query(
    `UPDATE dw.envio_carga SET estado_envio = $2 WHERE id_envio = $1
     RETURNING id_envio, codigo_envio, estado_envio`,
    [id, estado_envio]
  );

  if (envio.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Envío no encontrado', code: 'SHIPMENT_NOT_FOUND' });
  }

  res.json({ success: true, message: 'Estado actualizado', data: envio.rows[0] });
};

export default { crearEnvio, listarEnvios, obtenerEnvio, cambiarEstadoEnvio };
