// ============================================
// Controlador: Catálogo (estaciones, trenes, rutas, viajes, asientos)
// ============================================

import { query } from '../config/database.js';

const ID_EMPRESA_DEFAULT = 1; // el sistema modela una sola empresa

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
            v.estado_viaje, t.codigo_tren, rf.nombre AS ruta,
            rf.distancia_km, rf.duracion_estimada_minutos,
            rf.tarifa_adulto, rf.tarifa_niño, rf.tarifa_senior,
            e_o.ciudad AS ciudad_origen, e_d.ciudad AS ciudad_destino
     FROM dw.viaje v
     JOIN dw.tren t ON v.id_tren = t.id_tren
     JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
     JOIN dw.estacion e_o ON rf.estacion_origen = e_o.id_estacion
     JOIN dw.estacion e_d ON rf.estacion_destino = e_d.id_estacion
     WHERE v.estado_viaje NOT IN ('cancelado')
     ORDER BY v.fecha_salida ASC`
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
    `SELECT a.id_asiento, a.codigo_asiento, a.fila, a.columna, a.ventana, a.pasillo,
            w.id_wagon, w.tipo_wagon,
            CASE WHEN r.id_asiento IS NOT NULL THEN 'ocupado' ELSE 'disponible' END AS estado
     FROM dw.asiento a
     JOIN dw.wagon w ON a.id_wagon = w.id_wagon
     LEFT JOIN (
       SELECT DISTINCT id_asiento FROM dw.venta
       WHERE id_viaje = $2 AND estado_venta IN ('activa', 'pagada')
     ) r ON a.id_asiento = r.id_asiento
     WHERE w.id_tren = $1
     ORDER BY w.id_wagon, a.fila, a.columna`,
    [viaje.rows[0].id_tren, id]
  );

  res.json({ success: true, data: resultado.rows });
};

/**
 * GET /api/catalogo/viajes/:id/vagones-carga
 * Vagones de carga del tren de ese viaje, con capacidad ya ocupada por
 * envíos registrados (no cancelados) y capacidad restante.
 */
export const vagonesCargaDisponiblesPorViaje = async (req, res) => {
  const { id } = req.params;

  const viaje = await query('SELECT id_tren FROM dw.viaje WHERE id_viaje = $1', [id]);
  if (viaje.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Viaje no encontrado', code: 'TRIP_NOT_FOUND' });
  }

  const resultado = await query(
    `SELECT w.id_wagon, w.codigo_wagon, wc.capacidad_carga_kg, wc.tipo_carga,
            COALESCE(SUM(ec.peso_kg) FILTER (WHERE ec.estado_envio != 'cancelado'), 0) AS peso_ocupado_kg,
            wc.capacidad_carga_kg - COALESCE(SUM(ec.peso_kg) FILTER (WHERE ec.estado_envio != 'cancelado'), 0) AS peso_disponible_kg
     FROM dw.wagon w
     JOIN dw.wagon_carga wc ON wc.id_wagon = w.id_wagon
     LEFT JOIN dw.envio_carga ec ON ec.id_wagon_carga = w.id_wagon AND ec.id_viaje = $2
     WHERE w.id_tren = $1
     GROUP BY w.id_wagon, w.codigo_wagon, wc.capacidad_carga_kg, wc.tipo_carga
     ORDER BY w.id_wagon`,
    [viaje.rows[0].id_tren, id]
  );

  res.json({ success: true, data: resultado.rows });
};

/**
 * POST /api/catalogo/estaciones
 * Crea una nueva estación (ciudad/destino nuevo)
 * @body { nombre, ciudad, departamento? }
 */
export const crearEstacion = async (req, res) => {
  const { nombre, ciudad, departamento } = req.body;

  if (!nombre || !ciudad) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: nombre, ciudad',
      code: 'MISSING_FIELDS'
    });
  }

  const resultado = await query(
    `INSERT INTO dw.estacion (nombre, ciudad, departamento, id_empresa)
     VALUES ($1, $2, $3, $4)
     RETURNING id_estacion, nombre, ciudad`,
    [nombre, ciudad, departamento || null, ID_EMPRESA_DEFAULT]
  );

  res.status(201).json({ success: true, message: 'Estación creada exitosamente', data: resultado.rows[0] });
};

/**
 * POST /api/catalogo/rutas
 * Crea una nueva ruta ferroviaria entre dos estaciones existentes
 * @body { nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos,
 *         rendimiento_combustible_kml?, tarifa_adulto?, tarifa_niño?, tarifa_senior? }
 */
export const crearRuta = async (req, res) => {
  const {
    nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos,
    rendimiento_combustible_kml, tarifa_adulto, tarifa_niño, tarifa_senior
  } = req.body;

  if (!nombre || !estacion_origen || !estacion_destino || !distancia_km || !duracion_estimada_minutos) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos',
      code: 'MISSING_FIELDS'
    });
  }

  if (Number(estacion_origen) === Number(estacion_destino)) {
    return res.status(400).json({
      success: false,
      message: 'La estación de origen y destino deben ser distintas',
      code: 'INVALID_ROUTE'
    });
  }

  try {
    const resultado = await query(
      `INSERT INTO dw.ruta_ferroviaria
          (nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos,
           rendimiento_combustible_kml, tarifa_adulto, tarifa_niño, tarifa_senior)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id_ruta, nombre, distancia_km, duracion_estimada_minutos`,
      [
        nombre, estacion_origen, estacion_destino, distancia_km, duracion_estimada_minutos,
        rendimiento_combustible_kml || 3.5, tarifa_adulto || 60, tarifa_niño || 0, tarifa_senior || 0
      ]
    );
    res.status(201).json({ success: true, message: 'Ruta creada exitosamente', data: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una ruta entre esas dos estaciones',
        code: 'ROUTE_ALREADY_EXISTS'
      });
    }
    throw error;
  }
};

/**
 * POST /api/catalogo/viajes
 * Programa un nuevo viaje (fecha/hora concreta) sobre una ruta existente,
 * con una locomotora asignada. Esto es lo que aparece como comprable.
 * @body { id_ruta, id_tren, fecha_salida, fecha_llegada_estimada }
 */
export const crearViaje = async (req, res) => {
  const { id_ruta, id_tren, fecha_salida, fecha_llegada_estimada } = req.body;

  if (!id_ruta || !id_tren || !fecha_salida || !fecha_llegada_estimada) {
    return res.status(400).json({
      success: false,
      message: 'Campos requeridos: id_ruta, id_tren, fecha_salida, fecha_llegada_estimada',
      code: 'MISSING_FIELDS'
    });
  }

  if (new Date(fecha_llegada_estimada) <= new Date(fecha_salida)) {
    return res.status(400).json({
      success: false,
      message: 'La fecha de llegada estimada debe ser posterior a la de salida',
      code: 'INVALID_DATES'
    });
  }

  const codigoViaje = `VJ-${Date.now()}`;
  const resultado = await query(
    `INSERT INTO dw.viaje (codigo_viaje, id_tren, id_ruta, fecha_salida, fecha_llegada_estimada, estado_viaje)
     VALUES ($1, $2, $3, $4, $5, 'programado')
     RETURNING id_viaje, codigo_viaje, fecha_salida, fecha_llegada_estimada`,
    [codigoViaje, id_tren, id_ruta, fecha_salida, fecha_llegada_estimada]
  );

  res.status(201).json({ success: true, message: 'Viaje programado exitosamente', data: resultado.rows[0] });
};

export default {
  listarRoles,
  listarEstaciones,
  listarTrenes,
  listarRutas,
  listarViajes,
  asientosDisponiblesPorViaje,
  vagonesCargaDisponiblesPorViaje,
  crearEstacion,
  crearRuta,
  crearViaje
};
