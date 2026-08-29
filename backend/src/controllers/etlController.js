// ============================================
// Controlador: ETL del Data Warehouse
// Extrae datos de las tablas transaccionales (venta, pago, viaje)
// y los carga en las tablas analíticas del DW (metrica_ocupacion, metrica_combustible)
// ============================================

import pool, { query } from '../config/database.js';

/**
 * POST /api/admin/etl/ejecutar
 * Solo administradores. Ejecuta el pipeline ETL completo:
 * 1. metrica_ocupacion ← reservas + asientos + viajes reales
 * 2. metrica_combustible ← viajes + rutas (consumo estimado por km)
 */
export const ejecutarETL = async (req, res) => {
  const inicio = Date.now();
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    // ---- ETL 1: Ocupación desde ventas reales ----
    const etlOcupacion = await cliente.query(`
      WITH ocupacion_real AS (
        SELECT
          v.id_ruta,
          a.id_wagon,
          DATE(v.fecha_salida) AS fecha_calculo,
          COUNT(DISTINCT r.id_asiento) FILTER (WHERE r.estado_venta = 'pagada') AS asientos_vendidos,
          wp.cantidad_asientos AS asientos_totales
        FROM dw.viaje v
        JOIN dw.venta r ON v.id_viaje = r.id_viaje
        JOIN dw.asiento a ON r.id_asiento = a.id_asiento
        JOIN dw.wagon_pasajeros wp ON a.id_wagon = wp.id_wagon
        WHERE r.estado_venta != 'cancelada'
        GROUP BY v.id_ruta, a.id_wagon, DATE(v.fecha_salida), wp.cantidad_asientos
      ),
      upserted AS (
        INSERT INTO dw.metrica_ocupacion
          (id_indicador, id_ruta, id_wagon, fecha_calculo, asientos_vendidos, asientos_totales, tasa_ocupacion, estado_ruta)
        SELECT
          1,
          id_ruta,
          id_wagon,
          fecha_calculo,
          asientos_vendidos,
          asientos_totales,
          ROUND((asientos_vendidos::NUMERIC / NULLIF(asientos_totales, 0)) * 100, 2),
          CASE
            WHEN (asientos_vendidos::NUMERIC / NULLIF(asientos_totales, 0)) * 100 >= 70 THEN 'alta'
            WHEN (asientos_vendidos::NUMERIC / NULLIF(asientos_totales, 0)) * 100 >= 30 THEN 'normal'
            ELSE 'baja'
          END
        FROM ocupacion_real
        ON CONFLICT (id_ruta, id_wagon, fecha_calculo) DO UPDATE SET
          asientos_vendidos = EXCLUDED.asientos_vendidos,
          asientos_totales  = EXCLUDED.asientos_totales,
          tasa_ocupacion    = EXCLUDED.tasa_ocupacion,
          estado_ruta       = EXCLUDED.estado_ruta
        RETURNING (xmax = 0) AS es_nuevo
      )
      SELECT
        COUNT(*) FILTER (WHERE es_nuevo)      AS insertados,
        COUNT(*) FILTER (WHERE NOT es_nuevo)  AS actualizados
      FROM upserted
    `);

    // ---- ETL 2: Combustible estimado desde viajes completados ----
    const etlCombustible = await cliente.query(`
      WITH consumo_estimado AS (
        SELECT
          v.id_tren,
          DATE(v.fecha_salida) AS fecha_calculo,
          rf.distancia_km,
          ROUND(rf.distancia_km / NULLIF(rf.rendimiento_combustible_kml, 0), 2) AS combustible_consumido,
          rf.rendimiento_combustible_kml,
          ROUND((rf.distancia_km / NULLIF(rf.rendimiento_combustible_kml, 0)) * 3.72, 2) AS costo,
          ROUND(
            ((rf.distancia_km / NULLIF(rf.rendimiento_combustible_kml, 0)) - (rf.distancia_km / 4.5))
            / NULLIF(rf.distancia_km / 4.5, 0) * 100, 2
          ) AS desviacion
        FROM dw.viaje v
        JOIN dw.ruta_ferroviaria rf ON v.id_ruta = rf.id_ruta
        WHERE v.estado_viaje IN ('completado', 'en_transito')
      ),
      upserted AS (
        INSERT INTO dw.metrica_combustible
          (id_indicador, id_tren, fecha_calculo, distancia_recorrida_km,
           combustible_consumido_litros, rendimiento_kml, costo_combustible, desviacion_esperado)
        SELECT
          2,
          id_tren,
          fecha_calculo,
          distancia_km,
          combustible_consumido,
          rendimiento_combustible_kml,
          costo,
          desviacion
        FROM consumo_estimado
        ON CONFLICT (id_tren, fecha_calculo) DO UPDATE SET
          distancia_recorrida_km       = EXCLUDED.distancia_recorrida_km,
          combustible_consumido_litros = EXCLUDED.combustible_consumido_litros,
          costo_combustible            = EXCLUDED.costo_combustible,
          desviacion_esperado          = EXCLUDED.desviacion_esperado
        RETURNING (xmax = 0) AS es_nuevo
      )
      SELECT
        COUNT(*) FILTER (WHERE es_nuevo)      AS insertados,
        COUNT(*) FILTER (WHERE NOT es_nuevo)  AS actualizados
      FROM upserted
    `);

    await cliente.query('COMMIT');

    res.json({
      success: true,
      message: 'ETL ejecutado correctamente',
      data: {
        ocupacion: {
          insertados:   Number(etlOcupacion.rows[0].insertados),
          actualizados: Number(etlOcupacion.rows[0].actualizados)
        },
        combustible: {
          insertados:   Number(etlCombustible.rows[0].insertados),
          actualizados: Number(etlCombustible.rows[0].actualizados)
        },
        duracionMs: Date.now() - inicio
      },
      ejecutadoEn: new Date().toISOString()
    });

  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('[ETL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al ejecutar ETL',
      code: 'ETL_ERROR',
      detail: error.message
    });
  } finally {
    cliente.release();
  }
};

/**
 * GET /api/admin/etl/estado
 * Resumen del estado actual del Data Warehouse (KPIs del tablero de control)
 */
export const estadoETL = async (req, res) => {
  try {
    const [ocupacion, combustible, ingresos, rutasOcupacion] = await Promise.all([

      // Resumen de métricas de ocupación
      query(`
        SELECT
          COUNT(*)                        AS total_registros,
          MIN(fecha_calculo)::TEXT        AS desde,
          MAX(fecha_calculo)::TEXT        AS hasta,
          ROUND(AVG(tasa_ocupacion), 2)   AS ocupacion_promedio,
          SUM(asientos_vendidos)          AS total_asientos_vendidos,
          SUM(asientos_totales)           AS total_asientos_disponibles
        FROM dw.metrica_ocupacion
        WHERE estado_ruta IS NOT NULL
          AND asientos_totales IS NOT NULL
      `),

      // Resumen de métricas de combustible
      query(`
        SELECT
          COUNT(*)                                        AS total_registros,
          MIN(fecha_calculo)::TEXT                        AS desde,
          MAX(fecha_calculo)::TEXT                        AS hasta,
          ROUND(SUM(combustible_consumido_litros), 2)     AS total_combustible,
          ROUND(SUM(costo_combustible), 2)                AS costo_total,
          ROUND(AVG(rendimiento_kml), 2)                  AS rendimiento_promedio,
          ROUND(AVG(desviacion_esperado), 2)              AS desviacion_promedio
        FROM dw.metrica_combustible
      `),

      // Ingresos reales desde pagos
      query(`
        SELECT
          COUNT(DISTINCT p.id_pago)   AS total_pagos,
          ROUND(SUM(p.monto), 2)      AS ingresos_totales,
          COUNT(DISTINCT p.tipo_pago) AS metodos_pago,
          MIN(p.fecha_pago)::TEXT     AS primer_pago,
          MAX(p.fecha_pago)::TEXT     AS ultimo_pago
        FROM dw.pago p
        WHERE p.estado_pago = 'confirmado'
      `),

      // Ocupación por ruta (últimos 30 días)
      query(`
        SELECT
          rf.nombre                        AS ruta,
          ROUND(AVG(mo.tasa_ocupacion), 1) AS ocupacion_pct,
          MAX(mo.fecha_calculo)::TEXT       AS ultima_actualizacion
        FROM dw.metrica_ocupacion mo
        JOIN dw.ruta_ferroviaria rf ON mo.id_ruta = rf.id_ruta
        WHERE mo.fecha_calculo >= CURRENT_DATE - INTERVAL '30 days'
          AND mo.estado_ruta IS NOT NULL
        GROUP BY rf.nombre
        ORDER BY ocupacion_pct DESC
      `)
    ]);

    res.json({
      success: true,
      data: {
        ocupacion:     ocupacion.rows[0],
        combustible:   combustible.rows[0],
        ingresos:      ingresos.rows[0],
        rutasOcupacion: rutasOcupacion.rows,
        ultimaConsulta: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ETL ESTADO] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del Data Warehouse',
      code: 'ETL_ESTADO_ERROR'
    });
  }
};
