import express from 'express';
import { obtenerKPIs } from '../controllers/dashboardController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/dashboard/kpis?fecha_inicio=&fecha_fin=
 * KPIs gerenciales — consulta única optimizada (Actividad 7, Paso 2)
 */
router.get('/kpis', requirePermission(['reportes:ingresos', 'operaciones:ver_dashboard']), obtenerKPIs);

export default router;
