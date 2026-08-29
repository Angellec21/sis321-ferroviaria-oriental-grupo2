// ============================================
// Controlador: Dashboard KPIs — Actividad 7
// GET /api/dashboard/kpis — consulta única optimizada
// ============================================

import { query } from '../config/database.js';

/**
 * GET /api/dashboard/kpis?fecha_inicio=&fecha_fin=
 * Retorna todos los KPIs del dashboard gerencial en una sola consulta SQL.
 * Incluye: ingresos, ocupación, mantenimiento, tendencias y series temporales.
 */
export const obtenerKPIs = async (req, res) => {
  const fechaInicio = req.query.fecha_inicio || '2020-01-01';
  const fechaFin    = req.query.fecha_fin    || '2099-12-31';

  try {
    const resultado = await query(`
      WITH

      -- Pagos confirmados en el período
      pagos_periodo AS (
        SELECT monto, tipo_pago, fecha_pago
        FROM dw.pago
        WHERE estado_pago = 'confirmado'
          AND fecha_pago >= $1::TIMESTAMP
          AND fecha_pago <  ($2::DATE + INTERVAL '1 day')::TIMESTAMP
      ),

      -- Serie temporal: ingresos agrupados por día
      ingresos_por_dia AS (
        SELECT
          DATE(fecha_pago)   AS dia,
          SUM(monto)         AS total,
          COUNT(*)           AS cantidad
        FROM pagos_periodo
        GROUP BY DATE(fecha_pago)
        ORDER BY dia
      ),

      -- Desglose: ingresos por método de pago
      ingresos_por_metodo AS (
        SELECT
          tipo_pago            AS metodo,
          ROUND(SUM(monto), 2) AS total,
          COUNT(*)             AS transacciones
        FROM pagos_periodo
        GROUP BY tipo_pago
      ),

      -- Ocupación promedio por ruta (DW)
      ocupacion_por_ruta AS (
        SELECT
          rf.nombre                        AS ruta,
          ROUND(AVG(mo.tasa_ocupacion), 1) AS ocupacion_pct
        FROM dw.metrica_ocupacion mo
        JOIN dw.ruta_ferroviaria rf ON mo.id_ruta = rf.id_ruta
        WHERE mo.fecha_calculo >= $1::DATE
          AND mo.fecha_calculo <= $2::DATE
          AND mo.estado_ruta IS NOT NULL
        GROUP BY rf.nombre
        ORDER BY ocupacion_pct DESC
      ),

      -- Tendencia de ocupación: promedio semanal (últimas 12 semanas del DW)
      tendencia_ocupacion AS (
        SELECT
          DATE_TRUNC('week', fecha_calculo)::DATE AS semana,
          ROUND(AVG(tasa_ocupacion), 1)           AS ocupacion_pct
        FROM dw.metrica_ocupacion
        WHERE fecha_calculo >= CURRENT_DATE - INTERVAL '12 weeks'
          AND estado_ruta IS NOT NULL
        GROUP BY DATE_TRUNC('week', fecha_calculo)
        ORDER BY semana
      ),

      -- Resumen de mantenimiento por prioridad
      mant_resumen AS (
        SELECT
          CASE
            WHEN (tm.intervalo_viajes - (t.viajes_acumulados - om.viajes_acumulados_al_crear)) < 50   THEN 'urgente'
            WHEN (tm.intervalo_viajes - (t.viajes_acumulados - om.viajes_acumulados_al_crear)) < 150  THEN 'proximo'
            ELSE 'normal'
          END AS prioridad,
          COUNT(*) AS cantidad
        FROM dw.orden_mantenimiento om
        JOIN dw.tren t             ON om.id_tren = t.id_tren
        JOIN dw.tipo_mantenimiento tm ON om.id_tipo_mant = tm.id_tipo_mant
        WHERE om.estado_orden IN ('pendiente', 'programado')
        GROUP BY 1
      )

      SELECT
        -- ── KPI 1: Ingresos totales del período ──────────────
        (SELECT COALESCE(SUM(monto), 0)   FROM pagos_periodo)      AS kpi_ingresos_periodo,

        -- ── KPI 2: Transacciones del período ─────────────────
        (SELECT COUNT(*)                   FROM pagos_periodo)      AS kpi_transacciones,

        -- ── KPI 3: Ticket promedio ────────────────────────────
        (SELECT ROUND(COALESCE(AVG(monto), 0), 2) FROM pagos_periodo) AS kpi_ticket_promedio,

        -- ── KPI 4: Ocupación promedio del DW ─────────────────
        (SELECT ROUND(AVG(ocupacion_pct), 1) FROM ocupacion_por_ruta) AS kpi_ocupacion_promedio,

        -- ── KPI 5: Ventas activas en este momento ─────────────
        (SELECT COUNT(*) FROM dw.venta WHERE estado_venta = 'activa')       AS kpi_reservas_activas,

        -- ── KPI 6: Trenes operativos ──────────────────────────
        (SELECT COUNT(*) FROM dw.tren WHERE estado = 'operativo')            AS kpi_trenes_operativos,

        -- ── KPI 7: Usuarios activos ───────────────────────────
        (SELECT COUNT(*) FROM dw.usuarios WHERE estado = true)               AS kpi_usuarios_activos,

        -- ── KPI 8: Mantenimientos urgentes ───────────────────
        (SELECT COALESCE(SUM(cantidad), 0) FROM mant_resumen WHERE prioridad = 'urgente') AS kpi_mant_urgentes,

        -- ── Series y desgloses (JSON) ─────────────────────────
        (SELECT COALESCE(JSON_AGG(ROW_TO_JSON(d) ORDER BY d.dia), '[]') FROM ingresos_por_dia d)     AS serie_ingresos_dia,
        (SELECT COALESCE(JSON_AGG(ROW_TO_JSON(m)), '[]')                FROM ingresos_por_metodo m)  AS serie_ingresos_metodo,
        (SELECT COALESCE(JSON_AGG(ROW_TO_JSON(o)), '[]')                FROM ocupacion_por_ruta o)   AS serie_ocupacion_ruta,
        (SELECT COALESCE(JSON_AGG(ROW_TO_JSON(s) ORDER BY s.semana), '[]') FROM tendencia_ocupacion s) AS serie_tendencia,
        (SELECT COALESCE(JSON_AGG(ROW_TO_JSON(mr)), '[]')               FROM mant_resumen mr)        AS serie_mantenimiento
    `, [fechaInicio, fechaFin]);

    const kpis = resultado.rows[0];

    res.json({
      success: true,
      data: {
        kpis: {
          ingresos_periodo:    Number(kpis.kpi_ingresos_periodo),
          transacciones:       Number(kpis.kpi_transacciones),
          ticket_promedio:     Number(kpis.kpi_ticket_promedio),
          ocupacion_promedio:  Number(kpis.kpi_ocupacion_promedio) || 0,
          reservas_activas:    Number(kpis.kpi_reservas_activas),
          trenes_operativos:   Number(kpis.kpi_trenes_operativos),
          usuarios_activos:    Number(kpis.kpi_usuarios_activos),
          mant_urgentes:       Number(kpis.kpi_mant_urgentes)
        },
        series: {
          ingresos_dia:    kpis.serie_ingresos_dia,
          ingresos_metodo: kpis.serie_ingresos_metodo,
          ocupacion_ruta:  kpis.serie_ocupacion_ruta,
          tendencia:       kpis.serie_tendencia,
          mantenimiento:   kpis.serie_mantenimiento
        }
      },
      filtros: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DASHBOARD KPIS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener KPIs del dashboard',
      code: 'KPI_ERROR',
      detail: error.message
    });
  }
};
