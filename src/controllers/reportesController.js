// ============================================
// Controlador: Reportes (Query A, B, C - Actividad 3)
// ============================================

import { query } from '../config/database.js';

/**
 * GET /api/reportes/ingresos
 * Query A: Ingresos por método de pago en un rango de fechas
 * @query fecha_inicio, fecha_fin (YYYY-MM-DD)
 */
export const ingresosPorMetodoPago = async (req, res) => {
  try {
    const fechaInicio = req.query.fecha_inicio || '1900-01-01';
    const fechaFin = req.query.fecha_fin || '2999-12-31';

    const resultado = await query(
      `SELECT
          p.tipo_pago AS "metodoPago",
          DATE_TRUNC('day', p.fecha_pago)::DATE AS "fecha",
          COUNT(DISTINCT p.id_pago) AS "transacciones",
          ROUND(SUM(p.monto)::NUMERIC, 2) AS "montoTotal",
          ROUND(AVG(p.monto)::NUMERIC, 2) AS "montoPromedio",
          ROUND(MIN(p.monto)::NUMERIC, 2) AS "montoMinimo",
          ROUND(MAX(p.monto)::NUMERIC, 2) AS "montoMaximo",
          ROUND(STDDEV_POP(p.monto)::NUMERIC, 2) AS "desviacionEstandar",
          ROUND(
            (COUNT(CASE WHEN p.estado_pago = 'confirmado' THEN 1 END)::DECIMAL / COUNT(*)) * 100,
            2
          ) AS "tasaExito"
       FROM dw.pago p
       WHERE p.estado_pago IN ('confirmado', 'completado')
         AND p.fecha_pago >= $1::TIMESTAMP
         AND p.fecha_pago < $2::TIMESTAMP
       GROUP BY p.tipo_pago, DATE_TRUNC('day', p.fecha_pago)::DATE
       ORDER BY "fecha" DESC, "montoTotal" DESC`,
      [fechaInicio, fechaFin]
    );

    res.json({
      success: true,
      data: resultado.rows,
      filtros: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    });
  } catch (error) {
    console.error('[REPORTES INGRESOS] Error:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte de ingresos', code: 'REPORT_ERROR' });
  }
};

/**
 * GET /api/reportes/ocupacion
 * Query B: Tasa de ocupación por ruta y tipo de vagón
 * @query fecha_inicio, fecha_fin (YYYY-MM-DD)
 */
export const ocupacionPorRuta = async (req, res) => {
  try {
    const fechaInicio = req.query.fecha_inicio || '1900-01-01';
    const fechaFin = req.query.fecha_fin || '2999-12-31';

    const resultado = await query(
      `SELECT
          rf.id_ruta AS "idRuta",
          rf.nombre AS "ruta",
          CONCAT(e_o.ciudad, ' -> ', e_d.ciudad) AS "rutaCiudades",
          w.tipo_wagon AS "tipoVagon",
          COUNT(DISTINCT mo.id_wagon) AS "vagones",
          ROUND(AVG(mo.tasa_ocupacion), 2) AS "ocupacionPromedio",
          ROUND(MIN(mo.tasa_ocupacion), 2) AS "ocupacionMinima",
          ROUND(MAX(mo.tasa_ocupacion), 2) AS "ocupacionMaxima",
          SUM(mo.asientos_vendidos) AS "asientosVendidos",
          SUM(mo.asientos_totales) AS "asientosDisponibles",
          CASE
            WHEN AVG(mo.tasa_ocupacion) < 30 THEN 'baja'
            WHEN AVG(mo.tasa_ocupacion) BETWEEN 30 AND 70 THEN 'normal'
            ELSE 'alta'
          END AS "rentabilidad",
          ROUND(SUM(mo.asientos_vendidos) * 60, 0) AS "ingresosEstimados"
       FROM dw.metrica_ocupacion mo
       INNER JOIN dw.wagon w ON mo.id_wagon = w.id_wagon
       INNER JOIN dw.ruta_ferroviaria rf ON mo.id_ruta = rf.id_ruta
       INNER JOIN dw.estacion e_o ON rf.estacion_origen = e_o.id_estacion
       INNER JOIN dw.estacion e_d ON rf.estacion_destino = e_d.id_estacion
       WHERE mo.fecha_calculo >= $1::DATE
         AND mo.fecha_calculo < $2::DATE
         AND mo.estado_ruta IS NOT NULL
       GROUP BY rf.id_ruta, rf.nombre, e_o.ciudad, e_d.ciudad, w.tipo_wagon
       ORDER BY "ocupacionPromedio" ASC, "ingresosEstimados" DESC`,
      [fechaInicio, fechaFin]
    );

    res.json({
      success: true,
      data: resultado.rows,
      filtros: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    });
  } catch (error) {
    console.error('[REPORTES OCUPACION] Error:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte de ocupación', code: 'REPORT_ERROR' });
  }
};

/**
 * GET /api/reportes/mantenimiento
 * Query C: Trenes con mantenimiento preventivo próximo
 */
export const mantenimientoProximo = async (req, res) => {
  try {
    const resultado = await query(
      `WITH siguiente_mantenimiento AS (
          SELECT id_tren, MIN(om.id_orden_mant) AS id_proximo_mant
          FROM dw.orden_mantenimiento om
          WHERE om.estado_orden IN ('pendiente', 'programado')
          GROUP BY id_tren
       ),
       detalle_tren_viajes AS (
          SELECT
              t.id_tren, t.codigo_tren, t.viajes_acumulados, t.estado,
              COUNT(DISTINCT CASE WHEN v.estado_viaje = 'completado' THEN v.id_viaje END) AS viajes_ultimo_mes,
              (SELECT id_proximo_mant FROM siguiente_mantenimiento sm WHERE sm.id_tren = t.id_tren) AS id_proximo_mant
          FROM dw.tren t
          LEFT JOIN dw.viaje v ON t.id_tren = v.id_tren
              AND DATE(v.fecha_salida) >= CURRENT_DATE - INTERVAL '30 days'
          WHERE t.estado = 'operativo'
          GROUP BY t.id_tren, t.codigo_tren, t.viajes_acumulados, t.estado
       )
       SELECT
          dtv.codigo_tren AS "codigoTren",
          dtv.viajes_acumulados AS "viajesAcumulados",
          dtv.viajes_ultimo_mes AS "viajesUltimoMes",
          om.codigo_orden AS "ordenMantenimiento",
          tm.nombre AS "tipoMantenimiento",
          tm.intervalo_viajes AS "intervaloViajes",
          om.viajes_acumulados_al_crear AS "viajesAlCrearOrden",
          (tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) AS "viajesRestantes",
          ROUND(
            ((tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear))::DECIMAL / tm.intervalo_viajes) * 100,
            2
          ) AS "porcentajeTiempoRestante",
          CURRENT_DATE + INTERVAL '1 day' *
              ((tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) / 10)
              AS "fechaProyectadaVencimiento",
          CASE
              WHEN (tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) < 50 THEN 'urgente'
              WHEN (tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) < 150 THEN 'proximo'
              ELSE 'normal'
          END AS "prioridad",
          om.estado_orden AS "estadoOrden",
          COALESCE(om.fecha_programada::TEXT, '-') AS "fechaProgramada",
          ROUND(tm.costo_promedio::NUMERIC, 2) AS "costoEstimado"
       FROM detalle_tren_viajes dtv
       LEFT JOIN dw.orden_mantenimiento om ON dtv.id_proximo_mant = om.id_orden_mant
       LEFT JOIN dw.tipo_mantenimiento tm ON om.id_tipo_mant = tm.id_tipo_mant
       WHERE om.id_orden_mant IS NOT NULL
       ORDER BY
          CASE
              WHEN (tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) < 50 THEN 1
              WHEN (tm.intervalo_viajes - (dtv.viajes_acumulados - om.viajes_acumulados_al_crear)) < 150 THEN 2
              ELSE 3
          END,
          "viajesRestantes" ASC`
    );

    res.json({ success: true, data: resultado.rows });
  } catch (error) {
    console.error('[REPORTES MANTENIMIENTO] Error:', error);
    res.status(500).json({ success: false, message: 'Error al generar reporte de mantenimiento', code: 'REPORT_ERROR' });
  }
};

export default {
  ingresosPorMetodoPago,
  ocupacionPorRuta,
  mantenimientoProximo
};
