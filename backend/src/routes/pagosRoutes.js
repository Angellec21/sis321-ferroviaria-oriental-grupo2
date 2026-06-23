// ============================================
// Rutas: Pagos
// ============================================

import express from 'express';
import * as pagosController from '../controllers/pagosController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requirePermission(['operaciones:crear_pago']), pagosController.crearPago);
router.get('/', requirePermission(['reportes:ingresos', 'operaciones:ver_dashboard']), pagosController.listarPagos);

export default router;
