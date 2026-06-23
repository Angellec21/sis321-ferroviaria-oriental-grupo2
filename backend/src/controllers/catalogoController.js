// ============================================
// Controlador: Catálogo (estaciones, trenes, rutas, viajes, asientos)
// ============================================

import { query } from '../config/database.js';

export const listarRoles = async (req, res) => {
  const resultado = await query(
    `SELECT id_rol, nombre, descripcion, nivel_acceso FROM dw.roles WHERE estado = TRUE ORDER BY nivel_acceso DESC`
  );
  res.json({ success: true, data: resultado.rows });
};

export const listarEstaciones = async (req, res) => {
  const resultado = await query(
    `SELECT id_estacion, nombre, ciudad, conectividad_estado FROM dw.estacion ORDER BY ciudad`
  );
  res.json({ success: true, data: resultado.rows });
};

export const listarTrenes = async (req, res) => {
  const resultado = await query(
    `SELECT id_tren, codigo_tren, capacidad_total_pasajeros, viajes_acumulados, estado
     FROM dw.tren ORDER BY codigo_tren`
  );
  res.json({ success: true, data: resultado.rows });
};

export const listarRutas = async (req, res) => {
  const resultado = await query(
    `SELECT rf.id_ruta, rf.nombre, e_o.ciudad AS origen, e_d.ciudad AS destino,
            rf.distancia_km, rf.duracion_estimada_minutos
     FROM dw.ruta_ferroviaria rf
     JOIN dw.estacion e_o ON rf.estacion_origen = e_o.id_estacion
     JOIN dw.estacion e_d ON rf.estacion_destino = e_d.id_estacion
     ORDER BY rf.nombre`
  );
  res.json({ success: true, data: resultado.rows });
};

export const listarViajes = async (req, res) => {
  const resultado = await query(
    `SELECT v.id_viaje, v.codigo_viaje, v.fecha_salida, v.fecha_llegada_estimada,
            v.estado_viaje, t.codigo_tren, rf.nombre AS ruta
     FROM dw.viaje v
     JOIN dw.tren t ON v.id_tren = t.id_tren
     JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
     ORDER BY v.fecha_salida DESC`
  );
  res.json({ success: true, data: resultado.rows });
};

/**
 * GET /api/catalogo/viajes/:id/asientos
 * Asientos disponibles para un viaje (excluye los ya reservados activos/pagados)
 */
export const asientosDisponiblesPorViaje = async (req, res) => {
  const { id } = req.params;

  const viaje = await query('SELECT id_tren FROM dw.viaje WHERE id_viaje = $1', [id]);
  if (viaje.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Viaje no encontrado', code: 'TRIP_NOT_FOUND' });
  }

  const resultado = await query(
    `SELECT a.id_asiento, a.codigo_asiento, w.id_wagon, w.tipo_wagon
     FROM dw.asiento a
     JOIN dw.wagon w ON a.id_wagon = w.id_wagon
     WHERE w.id_tren = $1
       AND a.id_asiento NOT IN (
         SELECT r.id_asiento FROM dw.reserva r
         WHERE r.id_viaje = $2 AND r.estado_reserva IN ('activa', 'pagada')
       )
     ORDER BY w.id_wagon, a.codigo_asiento`,
    [viaje.rows[0].id_tren, id]
  );

  res.json({ success: true, data: resultado.rows });
};

export default {
  listarRoles,
  listarEstaciones,
  listarTrenes,
  listarRutas,
  listarViajes,
  asientosDisponiblesPorViaje
};
