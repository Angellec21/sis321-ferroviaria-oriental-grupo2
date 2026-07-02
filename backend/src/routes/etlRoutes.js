// ============================================
// Rutas: ETL del Data Warehouse
// ============================================

import express from 'express';
import { ejecutarETL, estadoETL } from '../controllers/etlController.js';
import { requireRole, requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/admin/etl/estado
 * Estado actual del DW (KPIs). Accesible por gerentes y admins.
 */
router.get('/estado', requirePermission(['reportes:ingresos']), estadoETL);

/**
 * POST /api/admin/etl/ejecutar
 * Ejecuta el pipeline ETL completo. Solo administradores.
 */
router.post('/ejecutar', requireRole(['administrador']), ejecutarETL);

export default router;
