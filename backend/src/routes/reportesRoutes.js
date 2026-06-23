// ============================================
// Rutas: Reportes (Query A, B, C)
// ============================================

import express from 'express';
import * as reportesController from '../controllers/reportesController.js';
import * as iaController from '../controllers/iaController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/reportes/ingresos?fecha_inicio=&fecha_fin=
 * @description Query A: Ingresos totales por método de pago
 * @auth required (reportes:ingresos)
 */
router.get('/ingresos', requirePermission(['reportes:ingresos']), reportesController.ingresosPorMetodoPago);

/**
 * GET /api/reportes/ocupacion?fecha_inicio=&fecha_fin=
 * @description Query B: Tasa de ocupación por ruta y tipo de vagón
 * @auth required (reportes:ocupacion)
 */
router.get('/ocupacion', requirePermission(['reportes:ocupacion']), reportesController.ocupacionPorRuta);

/**
 * GET /api/reportes/mantenimiento
 * @description Query C: Trenes con mantenimiento preventivo próximo
 * @auth required (reportes:mantenimiento)
 */
router.get('/mantenimiento', requirePermission(['reportes:mantenimiento']), reportesController.mantenimientoProximo);

/**
 * GET /api/reportes/prediccion-demanda?id_ruta=&fecha=
 * @description Modelo Predictivo de Demanda (Servidor de IA / TensorFlow)
 * @auth required (reportes:ocupacion)
 */
router.get('/prediccion-demanda', requirePermission(['reportes:ocupacion']), iaController.predecirDemanda);

export default router;
