// ============================================
// Rutas: Ventas y Reservas
// ============================================

import express from 'express';
import * as ventasController from '../controllers/ventasController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requirePermission(['operaciones:crear_venta', 'operaciones:crear_reserva']), ventasController.crearVenta);
router.get('/', requirePermission(['operaciones:ver_dashboard', 'reportes:ingresos']), ventasController.listarVentas);
router.get('/:id', requirePermission(['operaciones:ver_dashboard', 'reportes:ingresos']), ventasController.obtenerVenta);
router.patch('/reservas/:id/cancelar', requirePermission(['operaciones:crear_reserva']), ventasController.cancelarReserva);

export default router;
